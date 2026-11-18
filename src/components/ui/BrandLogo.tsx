import Image from 'next/image';
import { cn } from '@/lib/utils';
import toplabIcon from '@/images/toplab-icon.png';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  tone?: 'blue' | 'inverse';
  alt?: string;
  priority?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-7 w-7 p-1.5 rounded-lg',
  sm: 'h-8 w-8 p-1.5 rounded-lg',
  md: 'h-9 w-9 p-1.5 rounded-xl',
  lg: 'h-[4.5rem] w-[4.5rem] p-3 rounded-2xl',
};

export function BrandLogo({ size = 'md', tone = 'blue', alt = '', priority, className }: BrandLogoProps) {
  return (
    <span className={cn(
      'relative inline-flex shrink-0 items-center justify-center bg-blue-600 ring-1 ring-inset ring-white/15',
      tone === 'inverse' && 'bg-white/10 ring-white/20',
      sizeClasses[size],
      className,
    )}>
      <Image src={toplabIcon} alt={alt} fill sizes="72px" priority={priority} className="object-contain" />
    </span>
  );
}
