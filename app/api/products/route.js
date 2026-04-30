import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET /api/products?clientId=<uuid>
//   Returns ordered list of products for the client. If the client has none
//   (legacy data, edge case), auto-creates a default "Main" product so the UI
//   always has at least one to switch to.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

    let { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("client_id", clientId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (!products || products.length === 0) {
      const { data: created } = await supabase
        .from("products")
        .insert({ client_id: clientId, name: "Main", slug: "main", position: 0 })
        .select()
        .single();
      products = created ? [created] : [];
    }

    return NextResponse.json({ products: products || [] });
  } catch (e) {
    console.error("[products GET]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/products  { clientId, name, description?, targetMarket?,
//   problemsSolved?, uniqueFeatures?, pricePoint?, productUrl?, productImageUrls? }
// Creates a new product for the client. All descriptive fields are optional;
// Express mode (POST /api/products/scrape) supplies them by parsing a URL.
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      clientId, name,
      description, targetMarket, problemsSolved, uniqueFeatures, pricePoint, productUrl,
      productImageUrls,
    } = body || {};
    if (!clientId || !name) return NextResponse.json({ error: "clientId + name required" }, { status: 400 });

    const { data: existing } = await supabase
      .from("products")
      .select("position")
      .eq("client_id", clientId)
      .order("position", { ascending: false })
      .limit(1);
    const nextPosition = existing?.[0]?.position != null ? existing[0].position + 1 : 0;

    const insert = {
      client_id: clientId,
      name,
      slug: slugify(name),
      position: nextPosition,
      product_image_urls: productImageUrls || null,
    };
    if (description) insert.description = description;
    if (targetMarket) insert.target_market = targetMarket;
    if (problemsSolved) insert.problems_solved = problemsSolved;
    if (uniqueFeatures) insert.unique_features = uniqueFeatures;
    if (pricePoint) insert.price_point = pricePoint;
    if (productUrl) insert.product_url = productUrl;

    const { data, error } = await supabase.from("products").insert(insert).select().single();
    if (error) throw error;
    return NextResponse.json({ product: data });
  } catch (e) {
    console.error("[products POST]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/products  { id, name?, productImageUrls?, position? }
//   Updates a product. Slug regenerates if name changes.
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, name, productImageUrls, position } = body || {};
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const updates = {};
    if (name) {
      updates.name = name;
      updates.slug = slugify(name);
    }
    if (productImageUrls !== undefined) updates.product_image_urls = productImageUrls;
    if (typeof position === "number") updates.position = position;
    const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json({ product: data });
  } catch (e) {
    console.error("[products PATCH]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/products  { id }
export async function DELETE(req) {
  try {
    const body = await req.json();
    const { id } = body || {};
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[products DELETE]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
