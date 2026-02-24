import { useEffect, useRef, useState } from "react";

interface CountdownOverlayProps {
  from: number;
  onComplete: () => void;
}

export function CountdownOverlay({ from, onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState(from);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (count <= 0) {
      onCompleteRef.current();
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count]);

  if (count <= 0) return null;

  return (
    <div className="countdown-overlay">
      <div className="countdown-number" key={count}>
        {count}
      </div>
    </div>
  );
}
