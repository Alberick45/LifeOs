"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { Loader2, Maximize } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import react-force-graph to avoid SSR window errors
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
})

type Node = {
  id: string
  name: string
  val: number
  color?: string
  photo?: string | null
}

type Link = {
  source: string
  target: string
  label: string
}

export default function GraphPage() {
  const [graphData, setGraphData] = useState<{nodes: Node[], links: Link[]}>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [windowSize, setWindowSize] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Handle resize
    const updateSize = () => {
      if (containerRef.current) {
        setWindowSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }
    }
    
    window.addEventListener("resize", updateSize)
    updateSize() // initial sizing
    
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch people
      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
      
      if (peopleError) throw peopleError

      // Fetch connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', user.id)

      if (connectionsError) throw connectionsError

      const nodes: Node[] = (peopleData || []).map(p => ({
        id: p.id,
        name: p.name,
        val: (p.strength_score || 50) / 10, // Size based on strength
        color: '#8b5cf6', // Primary color
        photo: p.photo
      }))

      const links: Link[] = (connectionsData || []).map(c => ({
        source: c.person_a_id,
        target: c.person_b_id,
        label: c.connection_type || "Connected"
      }))

      // Filter out links where nodes don't exist (e.g. archived people)
      const validNodes = new Set(nodes.map(n => n.id))
      const validLinks = links.filter(l => validNodes.has(l.source) && validNodes.has(l.target))

      setGraphData({ nodes, links: validLinks })
    } catch (error) {
      console.error("Error fetching graph data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Custom node drawing to render photos if available, or just circles
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name
    const fontSize = 12 / globalScale
    ctx.font = `${fontSize}px Sans-Serif`
    const textWidth = ctx.measureText(label).width
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2) // some padding

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + node.val, bckgDimensions[0], bckgDimensions[1])

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#e2e8f0' // slate-200
    ctx.fillText(label, node.x, node.y + node.val + bckgDimensions[1] / 2)

    ctx.beginPath()
    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false)
    ctx.fillStyle = node.color
    ctx.fill()
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relationship Graph</h1>
          <p className="text-gray-400 mt-1">A visual web of how your network is connected.</p>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 glass-panel rounded-xl overflow-hidden relative border border-white/10"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <p className="text-gray-400">No people in your active network yet.</p>
          </div>
        ) : (
          <ForceGraph2D
            width={windowSize.width}
            height={windowSize.height}
            graphData={graphData}
            nodeLabel="name"
            nodeColor="color"
            nodeRelSize={1}
            nodeCanvasObject={paintNode}
            linkColor={() => "rgba(255, 255, 255, 0.2)"}
            linkWidth={1.5}
            linkLabel="label"
            backgroundColor="#000000"
            // Ensure graph fits in view
            cooldownTicks={100}
            onEngineStop={(fg) => {
              // fg.zoomToFit(400)
            }}
          />
        )}
      </div>
    </div>
  )
}
