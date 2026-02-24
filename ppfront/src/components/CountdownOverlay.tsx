import { useEffect, useState } from "react";

interface CountdownOverlayProps {
  from: number;
  onComplete: () => void;
}

export function CountdownOverlay({ from, onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  if (count <= 0) return null;

  return (
    <div className="countdown-overlay">
      <div className="countdown-number" key={count}>
        {count}
      </div>
    </div>
  );
}
