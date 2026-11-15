/** Dark guidance card used beside forms (Posting guidelines, What is this?, Before you upload). */
export default function SideNote({ title, points }) {
  return (
    <aside className="h-fit rounded-2xl bg-dark p-6 text-white">
      <h2 className="text-xl font-bold">{title}</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-[13.5px] leading-5 text-[#c9cdd6]">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-[#8ea3f2]" aria-hidden />
            {p}
          </li>
        ))}
      </ul>
    </aside>
  );
}
