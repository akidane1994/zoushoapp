// 書影コンポーネント。
// Google Books / OpenBD から取得した thumbnailUrl があれば画像を、
// なければタイトルから決まる落ち着いた色面のプレースホルダを表示します。
// サイズは className（w / h / aspect-[3/4] など）で外から指定してください。

const COVER_COLORS = [
    "#3D5A4A", "#2E3A4A", "#9A6A3C", "#6E4A5C",
    "#38463C", "#7A3F34", "#3F5560", "#54603A",
  ];
  
  function colorFor(seed: string) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return COVER_COLORS[h % COVER_COLORS.length];
  }
  
  export default function BookCover({
    title,
    src,
    className = "",
  }: {
    title: string;
    src?: string;
    className?: string;
  }) {
    if (src) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          className={`object-cover bg-line ${className}`}
        />
      );
    }
    return (
      <div
        className={`flex flex-col justify-between p-3 overflow-hidden ${className}`}
        style={{ background: colorFor(title) }}
      >
        <span className="font-mincho text-white/95 leading-snug text-[clamp(11px,1.1vw,15px)]">
          {title}
        </span>
        <span className="text-white/55 text-[9px] border-t border-white/20 pt-1.5 tracking-wide" />
      </div>
    );
  }
  