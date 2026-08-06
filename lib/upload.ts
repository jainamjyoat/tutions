import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Missing Supabase Environment Variables! Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file."
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function uploadAssignmentFile(file: File): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    alert("Supabase Storage is not configured. Please check your .env.local credentials.");
    return null;
  }

  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `attachments/${fileName}`;

    const { error } = await supabase.storage
      .from("assignment-files")
      .upload(filePath, file);

    if (error) {
      console.error("Supabase storage upload error:", error);
      alert(`Upload failed: ${error.message}`);
      return null;
    }

    const { data } = supabase.storage
      .from("assignment-files")
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error("Upload helper failed:", err);
    return null;
  }
}