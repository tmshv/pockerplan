import { scales } from "../data/scales";

interface ScalePickerProps {
  selected: string;
  onSelect: (scaleId: string) => void;
}

export function ScalePicker({ selected, onSelect }: ScalePickerProps) {
  return (
    <div className="scale-picker">
      <label htmlFor="scale-select">Estimation Scale</label>
      <select
        id="scale-select"
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
      >
        {scales.map((scale) => (
          <option key={scale.id} value={scale.id}>
            {scale.name} ({scale.values.join(", ")})
          </option>
        ))}
      </select>
    </div>
  );
}
