"use client";

interface Props {
  rating: number;
  size?: number;
}

export default function Stars({ rating, size = 14 }: Props) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{ fontSize: size }}
          className={i <= Math.round(rating) ? "text-yellow-400" : "text-gray-200"}
        >
          ★
        </span>
      ))}
    </span>
  );
}