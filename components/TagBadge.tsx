import { Tag } from '../types';

interface TagBadgeProps {
  tag: Tag;
  onClick?: (tag: Tag) => void;
  removable?: boolean;
  onRemove?: (tag: Tag) => void;
}

const categoryStyles: Record<string, string> = {
  type: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  subspecialty: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  custom: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export const TagBadge = ({ tag, onClick, removable, onRemove }: TagBadgeProps) => {
  const baseStyles = categoryStyles[tag.category] || categoryStyles.custom;

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
        border transition-all ${baseStyles}
        ${onClick ? 'cursor-pointer hover:brightness-125' : ''}
      `}
      onClick={() => onClick?.(tag)}
    >
      {tag.name}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          className="ml-0.5 hover:text-white transition-colors"
          aria-label={`Remove ${tag.name} tag`}
        >
          ×
        </button>
      )}
    </span>
  );
};
