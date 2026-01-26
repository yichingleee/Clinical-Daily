import { Tag } from '../types';
import { TagBadge } from './TagBadge';

interface TagListProps {
  tags: Tag[];
  onTagClick?: (tag: Tag) => void;
  maxVisible?: number;
  className?: string;
}

export const TagList = ({ tags, onTagClick, maxVisible = 6, className = '' }: TagListProps) => {
  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          onClick={onTagClick}
        />
      ))}
      {remainingCount > 0 && (
        <span className="text-[10px] text-slate-400 font-mono">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};
