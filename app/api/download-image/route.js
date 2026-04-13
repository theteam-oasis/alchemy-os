export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url");
  let filename = searchParams.get("name") || "image.jpg";

  // Ensure filename ends with a proper image extension
  if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
    filename = filename.replace(/\.[^.]*$/, "") + ".jpg";
    if (filename === ".jpg") filename = "image.jpg";
  }

  if (!imageUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const res = await fetch(imageUrl);
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get("Content-Type") || "image/jpeg";

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": contentType.startsWith("image/") ? contentType : "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return new Response("Failed to fetch image", { status: 500 });
  }
}
