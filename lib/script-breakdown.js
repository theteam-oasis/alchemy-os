// Speaking rate: ~150 words per minute = 2.5 words/sec
const WPS = 2.5;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function generateSceneDesc(text) {
  const clean = text.replace(/\(.*?\)/g, "").trim();
  const lower = clean.toLowerCase();

  // Detect common script cues
  if (/\b(open|intro|opening|fade in|start)\b/i.test(lower)) return "Opening shot";
  if (/\b(close|outro|closing|fade out|end|final)\b/i.test(lower)) return "Closing shot";
  if (/\b(product|bottle|package|box|jar|tube)\b/i.test(lower)) return "Product showcase";
  if (/\b(testimonial|review|customer|user says|they say)\b/i.test(lower)) return "Testimonial";
  if (/\b(call to action|cta|shop now|buy|order|link|swipe|click|discount|code|offer)\b/i.test(lower)) return "Call to action";
  if (/\b(before.?after|transformation|results|glow)\b/i.test(lower)) return "Transformation / results";
  if (/\b(unbox|reveal|unwrap)\b/i.test(lower)) return "Unboxing / reveal";
  if (/\b(lifestyle|morning|routine|day|night|everyday)\b/i.test(lower)) return "Lifestyle moment";
  if (/\b(apply|application|demo|how.?to|using|step)\b/i.test(lower)) return "Product demo";
  if (/\b(problem|struggle|pain|frustrat|tired|sick of)\b/i.test(lower)) return "Problem statement";
  if (/\b(solution|answer|finally|discover|introducing)\b/i.test(lower)) return "Solution reveal";
  if (/\b(ingredient|formula|science|clinically|dermatolog)\b/i.test(lower)) return "Ingredients / science";
  if (/\b(hook|attention|stop|wait|did you know|imagine)\b/i.test(lower)) return "Hook";

  // Fallback: summarize from first few meaningful words
  const words = clean.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
  if (words.length > 0) {
    return words.join(" ").substring(0, 40) + (clean.length > 40 ? "..." : "");
  }
  return "Scene";
}

export function breakdownScript(rawText) {
  if (!rawText || !rawText.trim()) return { totalDuration: 0, totalFormatted: "0:00", sections: [] };

  // Split by double newlines, or single newlines if no doubles exist
  let blocks = rawText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  if (blocks.length <= 1) {
    // Try single newlines
    blocks = rawText.split(/\n/).map(b => b.trim()).filter(Boolean);
  }
  if (blocks.length === 0) return { totalDuration: 0, totalFormatted: "0:00", sections: [] };

  // If still just one block but it's long, split by sentences
  if (blocks.length === 1 && blocks[0].split(/\s+/).length > 20) {
    const sentences = blocks[0].match(/[^.!?]+[.!?]+/g) || [blocks[0]];
    // Group sentences into chunks of ~2-3 sentences for natural sections
    blocks = [];
    let chunk = "";
    for (const s of sentences) {
      chunk += s;
      const wordCount = chunk.trim().split(/\s+/).length;
      if (wordCount >= 8) {
        blocks.push(chunk.trim());
        chunk = "";
      }
    }
    if (chunk.trim()) blocks.push(chunk.trim());
  }

  let cumTime = 0;
  const sections = blocks.map((text, i) => {
    const wordCount = text.split(/\s+/).length;
    const duration = Math.max(wordCount / WPS, 1); // at least 1 second
    const startTime = cumTime;
    cumTime += duration;
    return {
      index: i + 1,
      text,
      wordCount,
      startTime,
      endTime: cumTime,
      startFormatted: formatTime(startTime),
      endFormatted: formatTime(cumTime),
      sceneDesc: generateSceneDesc(text),
    };
  });

  return {
    totalDuration: cumTime,
    totalFormatted: formatTime(cumTime),
    sections,
  };
}
