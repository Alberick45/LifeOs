"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import dynamic from 'next/dynamic'
import { Sparkles, Users } from "lucide-react"

// Dynamically import react-force-graph-2d to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { 
  ssr: false,
  loading: () => <div className="h-[600px] w-full flex items-center justify-center text-gray-500">Loading graph engine...</div>
})

export default function NetworkGraphPage() {
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGraphData()
  }, [])

  const fetchGraphData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch all people
      const { data: people, error: pError } = await supabase
        .from('people')
        .select('id, name, relationship_type, strength_score')
        .eq('user_id', user.id)

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
        { id: user.id, name: "Me (You)", group: "user", val: 30, color: "#8b5cf6" },
        ...(people || []).map(p => ({
          id: p.id,
          name: p.name,
          group: p.relationship_type,
          val: Math.max(10, (p.strength_score || 50) / 3), // Node size based on strength
          color: "#3b82f6"
        }))
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
    } catch (error) {
      console.error("Error fetching graph data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relationship Graph</h1>
          <p className="text-gray-400 mt-1">Visualize your network and see how everyone connects.</p>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-xl overflow-hidden relative border border-white/5">
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
            graphData={graphData}
            nodeLabel="" // We draw it manually now
            nodeRelSize={6}
            linkColor={() => "rgba(255,255,255,0.2)"}
            backgroundColor="#00000000" // transparent to see glass panel
            width={typeof window !== 'undefined' ? window.innerWidth > 1200 ? 1100 : window.innerWidth - 100 : 800}
            height={600}
            d3AlphaDecay={0.05}
            d3VelocityDecay={0.4}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12/globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              const textWidth = ctx.measureText(label).width;
              const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.beginPath();
              // Node Circle
              ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color;
              ctx.fill();

              // Node Label
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#ffffff';
              ctx.fillText(label, node.x, node.y + node.val + (fontSize/2) + 2);
            }}
          />
        )}
      </div>
    </div>
  )
}
