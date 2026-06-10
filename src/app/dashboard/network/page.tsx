"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import dynamic from 'next/dynamic'
import { Sparkles, Users, X, Edit, Heart, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatePresence, motion } from "framer-motion"

// Dynamically import react-force-graph-2d to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d').then((mod) => mod.default), { 
  ssr: false,
  loading: () => <div className="h-[600px] w-full flex items-center justify-center text-gray-500">Loading graph engine...</div>
})

const getRelationshipColor = (relType: string) => {
  if (!relType) return "#9ca3af";
  const lower = relType.toLowerCase();
  
  if (lower.includes("close friend") || lower.includes("best friend") || lower === "bff") {
    return "#d946ef"; // fuchsia for close friends
  }

  const familyKeywords = ["family", "mom", "mum", "mummy", "mama", "mother", "father", "dad", "daddy", "brother", "sister", "sibling", "cousin", "aunt", "uncle", "grandmother", "grandfather", "grandparent", "parent", "son", "daughter", "child", "mother-in-law", "father-in-law"];
  if (familyKeywords.some(keyword => lower.includes(keyword)) || lower === "family") {
    return "#f43f5e"; // rose for family
  }
  
  if (lower.includes("friend")) {
    return "#10b981"; // emerald for friends
  }
  
  if (lower.includes("classmate") || lower.includes("school") || lower.includes("peer") || lower.includes("college") || lower.includes("university")) {
    return "#3b82f6"; // blue for classmates
  }
  
  return "#eab308"; // amber for custom relationship types
}

export default function NetworkGraphPage() {
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const fgRef = useRef<any>(null)
  const router = useRouter()

  // Inline Node Editor State
  const [selectedNode, setSelectedNode] = useState<any | null>(null)
  const [editNodeData, setEditNodeData] = useState({ name: '', relationship_type: '' })
  const [savingNode, setSavingNode] = useState(false)

  useEffect(() => {
    // Load graph from local cache if available for offline-first support
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("lifeos_graph_cache")
      if (cached) {
        try {
          setGraphData(JSON.parse(cached))
          setLoading(false)
        } catch (e) {
          console.error("Failed to parse cached graph data:", e)
        }
      }
    }
    fetchGraphData()
  }, [])

  useEffect(() => {
    if (fgRef.current) {
      // Increase repulsion to spread nodes out heavily
      fgRef.current.d3Force('charge').strength(-800)
      fgRef.current.d3Force('link').distance(150)
    }
  }, [graphData, loading])

  const fetchGraphData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch all people (excluding archived)
      const { data: people, error: pError } = await supabase
        .from('people')
        .select('id, name, relationship_type, strength_score, pronouns')
        .eq('user_id', user.id)
        .is('is_archived', false)
        .is('status', null) // only verified people

      if (pError) throw pError

      // Fetch connections
      const { data: connections, error: cError } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', user.id)

      if (cError) throw cError

      // Format for react-force-graph
      // Note: We'll add the "User" as the central node
      const nodes = [
        { id: user.id, name: "Me (You)", group: "user", val: 45, pronouns: "Rather not say", color: "#8b5cf6", relationship_type: "User", strength_score: 100 },
        ...(people || []).map(p => {
          const relColor = getRelationshipColor(p.relationship_type || '');
          // Mathematical ratio: Enhanced linear scaling so 0-weight vs 100-weight is highly visually distinct
          const nodeVal = 6 + (p.strength_score || 0) * 0.3; // scales from 6 to 36
          return {
            id: p.id,
            name: p.name,
            group: p.relationship_type,
            pronouns: p.pronouns || 'Rather not say',
            val: nodeVal,
            color: relColor,
            relationship_type: p.relationship_type || 'Connection',
            strength_score: p.strength_score || 0
          };
        })
      ]

      const links = [
        // Link everyone directly to the user (hub-and-spoke model for MVP)
        ...(people || []).map(p => ({
          source: user.id,
          target: p.id,
          type: 'knows'
        })),
        // Add inter-connections between people
        ...(connections || []).map(c => ({
          source: c.person_a_id,
          target: c.person_b_id,
          type: c.connection_type
        }))
      ]

      setGraphData({ nodes, links })
      if (typeof window !== "undefined") {
        localStorage.setItem("lifeos_graph_cache", JSON.stringify({ nodes, links }))
      }
    } catch (error) {
      console.error("Error fetching graph data:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveInlineEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedNode) return
    setSavingNode(true)
    try {
      const { error } = await supabase
        .from('people')
        .update({
          name: editNodeData.name,
          relationship_type: editNodeData.relationship_type
        })
        .eq('id', selectedNode.id)

      if (error) throw error
      
      if (typeof window !== "undefined") {
        localStorage.removeItem("lifeos_people_cache")
      }
      setSelectedNode(null)
      await fetchGraphData()
    } catch (error) {
      console.error("Error updating connection inline:", error)
      alert("Failed to save changes.")
    } finally {
      setSavingNode(false)
    }
  }

  return (
    <div className="space-y-8 h-[calc(100vh-120px)] flex flex-col relative">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relationship Graph</h1>
          <p className="text-gray-400 mt-1">Visualize your network and see how everyone connects.</p>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-xl overflow-hidden relative border border-white/5">
        {/* Legend Box */}
        <div className="absolute top-4 left-4 p-4 rounded-xl bg-zinc-950/80 border border-white/10 backdrop-blur-md text-xs space-y-2 z-10">
          <div className="font-semibold text-gray-400 mb-1">Color Legend</div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#8b5cf6]" />
            <span className="text-gray-300">Me (You)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#f43f5e]" />
            <span className="text-gray-300">Family</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#d946ef]" />
            <span className="text-gray-300">Close Friends</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#10b981]" />
            <span className="text-gray-300">Friends</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#3b82f6]" />
            <span className="text-gray-300">Classmates</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#eab308]" />
            <span className="text-gray-300">Custom / Others</span>
          </div>
        </div>

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-8 w-8 animate-pulse text-primary" />
          </div>
        ) : graphData.nodes.length <= 1 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            <Users className="h-16 w-16 mb-4 opacity-20" />
            <p>Your graph is empty.</p>
            <p className="text-sm">Add people to your network to see connections.</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel="" // We draw it manually now
            nodeRelSize={6}
            linkColor={() => "rgba(255,255,255,0.2)"}
            backgroundColor="#00000000" // transparent to see glass panel
            width={typeof window !== 'undefined' ? window.innerWidth > 1200 ? 1100 : window.innerWidth - 100 : 800}
            height={600}
            d3AlphaDecay={0.05}
            d3VelocityDecay={0.4}
            onNodeClick={(node: any) => {
              if (node.id === graphData.nodes[0]?.id) return
              setSelectedNode(node)
              setEditNodeData({ name: node.name, relationship_type: node.relationship_type })
            }}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12/globalScale;
              const size = node.id === graphData.nodes[0]?.id ? 45 : node.val;

              // Determine Emoji based on pronouns
              let emoji = "🧑"
              if (node.pronouns === "He/Him") emoji = "👨"
              if (node.pronouns === "She/Her") emoji = "👩"

              // Draw Emoji
              ctx.font = `${size * 1.5}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              // Glow ring
              ctx.shadowColor = node.color || "#3b82f6";
              ctx.shadowBlur = node.id === graphData.nodes[0]?.id ? 15 : 8;
              ctx.fillStyle = node.color || "#3b82f6";
              ctx.beginPath();
              ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
              ctx.fill();
              
              ctx.shadowBlur = 0; // reset
              ctx.fillText(emoji, node.x, node.y);

              // Node Label
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#ffffff';
              
              // Text outline for readability
              ctx.lineWidth = 2 / globalScale;
              ctx.strokeStyle = 'rgba(0,0,0,0.8)';
              ctx.strokeText(label, node.x, node.y + size + (fontSize/2) + 6);
              ctx.fillText(label, node.x, node.y + size + (fontSize/2) + 6);
            }}
          />
        )}

        {/* Inline Node Editor Sidebar */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 350, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="absolute right-4 top-4 bottom-4 w-80 bg-zinc-950/90 border border-white/10 backdrop-blur-md rounded-xl p-6 flex flex-col justify-between shadow-2xl z-20 overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="font-bold text-lg text-white">Edit Connection</h3>
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={saveInlineEdit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-semibold uppercase">Name</label>
                    <input 
                      type="text"
                      value={editNodeData.name}
                      onChange={e => setEditNodeData({ ...editNodeData, name: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-semibold uppercase">Relationship Type</label>
                    <select
                      value={["Family", "Friend", "Classmate"].includes(editNodeData.relationship_type) ? editNodeData.relationship_type : "Custom"}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "Custom") {
                          setEditNodeData({ ...editNodeData, relationship_type: "Colleague" });
                        } else {
                          setEditNodeData({ ...editNodeData, relationship_type: val });
                        }
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-purple-500/50 [&>option]:bg-zinc-950"
                    >
                      <option value="Family">Family</option>
                      <option value="Friend">Friend</option>
                      <option value="Classmate">Classmate</option>
                      <option value="Custom">Custom...</option>
                    </select>

                    {!["Family", "Friend", "Classmate"].includes(editNodeData.relationship_type) && (
                      <input 
                        type="text"
                        placeholder="Custom Name..."
                        value={editNodeData.relationship_type}
                        onChange={e => setEditNodeData({ ...editNodeData, relationship_type: e.target.value })}
                        className="w-full bg-black/60 border border-white/10 rounded-lg p-2 mt-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                        required
                      />
                    )}
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <Heart className="h-4 w-4 text-rose-500" />
                      <span>Relationship Strength: <strong className="text-white">{selectedNode.strength_score}%</strong></span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={savingNode}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg"
                  >
                    {savingNode ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </div>

              <div className="border-t border-white/10 pt-4 mt-6">
                <Button 
                  onClick={() => router.push(`/dashboard/person/${selectedNode.id}`)}
                  variant="outline"
                  className="w-full border-white/10 hover:bg-white/5 text-gray-300 rounded-lg"
                >
                  View Full Profile <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
