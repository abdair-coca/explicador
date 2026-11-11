// One scene block, whatever its type; the plain layout, lessons and slides share it.
import type { Block } from '../../../server/src/scene.ts';
import { CalcScene } from '../lesson/Calc';
import { ChartScene } from '../lesson/Chart';
import { MatrixScene } from '../lesson/Matrix';
import { QuizView } from '../lesson/Quiz';
import { ThresholdScene } from '../lesson/Threshold';
import { JourneyScene } from '../lesson/Journey';
import { StatsView } from '../lesson/Stats';
import { TraceScene } from '../lesson/Trace';
import { Prose } from './Prose';
import { ArchScene, FlowScene } from './scenes';
import { DataScene, StateScene } from './views';

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'markdown':
      return (
        <div className="prose-exl max-w-3xl">
          <Prose>{block.text}</Prose>
        </div>
      );
    case 'arch':
      return <ArchScene block={block} />;
    case 'flow':
      return <FlowScene block={block} />;
    case 'data':
      return <DataScene block={block} />;
    case 'state':
      return <StateScene block={block} />;
    case 'journey':
      return <JourneyScene block={block} />;
    case 'trace':
      return <TraceScene block={block} />;
    case 'stats':
      return <StatsView block={block} />;
    case 'chart':
      return <ChartScene block={block} />;
    case 'matrix':
      return <MatrixScene block={block} />;
    case 'quiz':
      return <QuizView block={block} />;
    case 'calc':
      return <CalcScene block={block} />;
    case 'threshold':
      return <ThresholdScene block={block} />;
    // A chapter only means something in the lesson layout, which draws its header.
    case 'chapter':
      return null;
  }
}
