"use client";

import { useId, useState } from "react";
import { FilePlus2, Paperclip } from "lucide-react";

export function AttachmentUploader({ name = "files", imagesOnly = false, multiple = true, required = false }: { name?: string; imagesOnly?: boolean; multiple?: boolean; required?: boolean }) {
  const id = useId(); const [names, setNames] = useState<string[]>([]);
  return <div className="attachment-uploader"><label className="upload-dropzone" htmlFor={id}><span className="upload-icon">{imagesOnly ? <FilePlus2 aria-hidden /> : <Paperclip aria-hidden />}</span><span><strong>{imagesOnly ? "Dodaj zdjęcia" : "Dodaj załączniki"}</strong><small>{imagesOnly ? "JPG, PNG lub WebP — do 8 MB każdy" : "PDF, JPG, PNG lub WebP — do 8 MB każdy"}</small></span></label><input className="visually-hidden" id={id} name={name} type="file" accept={imagesOnly ? "image/jpeg,image/png,image/webp" : "application/pdf,image/jpeg,image/png,image/webp"} multiple={multiple} required={required} onChange={(event) => setNames(Array.from(event.target.files ?? []).map((file) => file.name))} />{names.length > 0 && <div className="upload-file-list">{names.map((filename) => <span key={filename}><Paperclip aria-hidden />{filename}</span>)}</div>}</div>;
}
