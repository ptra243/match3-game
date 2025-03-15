import {
  FireIcon,
  CloudIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import { Color } from '../../store/types';

interface TileIconProps {
  color: Color;
}

export const TileIcon: React.FC<TileIconProps> = ({ color }) => {
  switch (color) {
    case 'red':
      return <FireIcon className="w-8 h-8 text-red-200 pointer-events-none" />;
    case 'blue':
      return <CloudIcon className="w-8 h-8 text-blue-200 pointer-events-none" />;
    case 'green':
      return <SparklesIcon className="w-8 h-8 text-green-200 pointer-events-none" />;
    case 'yellow':
      return <CurrencyDollarIcon className="w-8 h-8 text-yellow-200 pointer-events-none" />;
    case 'black':
      return <ExclamationTriangleIcon className="w-8 h-8 text-gray-200 pointer-events-none" />;
    default:
      return null;
  }
}; 