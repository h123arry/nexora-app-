import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface VohSummaryButtonProps {
  content: string;
}

export default function VohSummaryButton({ content }: VohSummaryButtonProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const generateSummary = async () => {
    if (summary) {
      setShowTooltip(true);
      return;
    }
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/voh-ai/summarize-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      setSummary(data.text);
      setShowTooltip(true);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={generateSummary}
        className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors font-semibold"
      >
        <Sparkles className="w-3 h-3" />
        {isGenerating ? 'Generating...' : 'Generate VOH Summary'}
      </button>
      
      {showTooltip && summary && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white shadow-xl animate-in fade-in zoom-in">
          <p>{summary}</p>
          <button 
            onClick={() => setShowTooltip(false)}
            className="mt-2 text-[10px] text-zinc-400 hover:text-white"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
