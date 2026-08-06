export async function uploadAssignmentFile(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    // Send file to the server route (/api/upload)
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.publicUrl) {
      alert(data.error || "File upload failed.");
      return null;
    }

    return data.publicUrl;
  } catch (err) {
    console.error("Upload helper error:", err);
    alert("Network error while uploading file.");
    return null;
  }
}