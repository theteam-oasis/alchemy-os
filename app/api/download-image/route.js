export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url");
  const filename = searchParams.get("name") || "image.jpg";

  if (!imageUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();

    return new Response(blob, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return new Response("Failed to fetch image", { status: 500 });
  }
}
