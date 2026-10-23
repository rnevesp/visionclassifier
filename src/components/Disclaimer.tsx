import { ShieldAlert } from 'lucide-react';

export default function Disclaimer({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}
