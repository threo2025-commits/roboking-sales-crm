'use client';
import { useRef, useState } from 'react';

type Props = {
  accept?: string;
  multiple?: boolean;
  maxBytes?: number;
  label: string;
  hint?: string;
  files: File[];
  onFiles: (files: File[]) => void;
};

export function FileDropzone({ accept, multiple = false, maxBytes, label, hint, files, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  function choose(incoming: File[]) {
    setError('');
    const accepted = accept?.split(',').map((value) => value.trim().toLowerCase()) || [];
    const invalidType = accepted.length && incoming.find((file) => {
      const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      return !accepted.some((rule) => rule.startsWith('.') ? rule === extension : file.type === rule || (rule.endsWith('/*') && file.type.startsWith(rule.slice(0, -1))));
    });
    if (invalidType) {
      setError(`${invalidType.name} is not an allowed file type.`);
      return;
    }
    const oversized = maxBytes ? incoming.find((file) => file.size > maxBytes) : undefined;
    if (oversized) {
      setError(`${oversized.name} is too large. Maximum size is ${Math.round(maxBytes! / 1024 / 1024)}MB.`);
      return;
    }
    onFiles(multiple ? incoming : incoming.slice(0, 1));
  }

  return <div>
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        choose(Array.from(event.dataTransfer.files));
      }}
      className={`flex min-h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${dragging ? 'border-brandGold bg-amber-50' : 'border-slate-300 bg-slate-50 hover:border-brandGold'}`}
    >
      <span className="text-sm font-bold text-slate-800">{label}</span>
      {hint && <span className="mt-1 text-xs text-slate-500">{hint}</span>}
      {!!files.length && <span className="mt-3 max-w-full break-words rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700">{files.map((file) => `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`).join(', ')}</span>}
    </button>
    <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(event) => choose(Array.from(event.target.files || []))} />
    {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
  </div>;
}
