import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "../../../../lib/auth/session";
import { createSupabaseAdminClient, getProductImagesBucket, hasSupabaseEnv, isProductionRuntime } from "../../../../lib/supabase";

const MAX_IMAGE_COUNT = 6;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function slugifyFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

async function requireAdminUser() {
  const currentUser = await getCurrentSessionUser();
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "master_admin") || currentUser.accountState === "banned") {
    return null;
  }

  return currentUser;
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { ok: false, message: isProductionRuntime() ? "Supabase must be configured in production." : "Supabase storage is not configured." },
      { status: 503 },
    );
  }

  const currentUser = await requireAdminUser();
  if (!currentUser) {
    return NextResponse.json({ ok: false, message: "Admin access is required." }, { status: 403 });
  }

  const formData = await request.formData();
  const productId = String(formData.get("productId") ?? "").trim();
  const explicitPosition = Number(formData.get("position") ?? "0");
  const file = formData.get("file");

  if (!productId) {
    return NextResponse.json({ ok: false, message: "Product id is required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Image file is required." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, message: "Only image uploads are allowed." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, message: "Images must be 10MB or smaller." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const bucket = getProductImagesBucket();

  const [{ data: product, error: productError }, { data: existingImages, error: imagesError }] = await Promise.all([
    admin.from("products").select("id").eq("id", productId).single(),
    admin.from("product_images").select("id, position").eq("product_id", productId).order("position", { ascending: true }),
  ]);

  if (productError || !product) {
    return NextResponse.json({ ok: false, message: "Product not found." }, { status: 404 });
  }

  if (imagesError) {
    return NextResponse.json({ ok: false, message: imagesError.message }, { status: 500 });
  }

  const currentCount = existingImages?.length ?? 0;
  if (currentCount >= MAX_IMAGE_COUNT) {
    return NextResponse.json({ ok: false, message: "Each product can have up to 6 images." }, { status: 400 });
  }

  const nextPosition = Number.isFinite(explicitPosition) && explicitPosition >= 0
    ? explicitPosition
    : currentCount;
  const safeFilename = slugifyFilename(file.name || `product-image-${Date.now()}.jpg`);
  const storagePath = `${productId}/${Date.now()}-${safeFilename}`;
  const arrayBuffer = await file.arrayBuffer();
  const uploadResult = await admin.storage.from(bucket).upload(storagePath, arrayBuffer, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  });

  if (uploadResult.error) {
    return NextResponse.json({ ok: false, message: uploadResult.error.message }, { status: 500 });
  }

  const publicUrl = admin.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
  const insertResult = await admin.from("product_images").insert({
    product_id: productId,
    image_url: publicUrl,
    storage_path: storagePath,
    position: nextPosition,
  }).select("id, image_url, position").single();

  if (insertResult.error) {
    await admin.storage.from(bucket).remove([storagePath]);
    return NextResponse.json({ ok: false, message: insertResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    image: insertResult.data,
  });
}

export async function DELETE(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { ok: false, message: isProductionRuntime() ? "Supabase must be configured in production." : "Supabase storage is not configured." },
      { status: 503 },
    );
  }

  const currentUser = await requireAdminUser();
  if (!currentUser) {
    return NextResponse.json({ ok: false, message: "Admin access is required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const imageId = url.searchParams.get("imageId")?.trim();
  if (!imageId) {
    return NextResponse.json({ ok: false, message: "Image id is required." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const bucket = getProductImagesBucket();
  const { data: imageRow, error } = await admin.from("product_images").select("id, storage_path").eq("id", imageId).single();
  if (error || !imageRow) {
    return NextResponse.json({ ok: false, message: "Image not found." }, { status: 404 });
  }

  const deleteResult = await admin.from("product_images").delete().eq("id", imageId);
  if (deleteResult.error) {
    return NextResponse.json({ ok: false, message: deleteResult.error.message }, { status: 500 });
  }

  if (imageRow.storage_path) {
    await admin.storage.from(bucket).remove([imageRow.storage_path]);
  }

  return NextResponse.json({ ok: true });
}
