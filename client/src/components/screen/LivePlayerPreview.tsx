import React from 'react';

interface LivePlayerViewProps {
  screenId: number;
}

export const LivePlayerView: React.FC<LivePlayerViewProps> = ({ screenId }) => {
  const playerUrl = `/screen-player?screenId=${screenId}`;
  const playerWidth = 1920;
  const playerHeight = 1080;

  return (
    <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: `${playerWidth}px`,
          height: `${playerHeight}px`,
          transform: `scale(calc(100% / ${playerWidth}))`,
        }}
      >
        <iframe
          src={playerUrl}
          title={`Vista en vivo de la Pantalla ${screenId}`}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          scrolling="no"
        />
      </div>
    </div>
  );
};