// One scene block, whatever its type; the plain layout, lessons and slides share it.
import type { Block } from '../../../server/src/scene.ts';
import { CalcScene } from '../lesson/Calc';
import { ChartScene } from '../lesson/Chart';
import { CompareScene } from '../lesson/Compare';
import { ConceptView } from '../lesson/Concept';
import { DeriveScene } from '../lesson/Derive';
import { MatrixScene } from '../lesson/Matrix';
import { PlotScene } from '../lesson/Plot';
import { ScatterScene } from '../lesson/Scatter';
import { SpaceScene } from '../lesson/Space';
import { CosineScene } from '../lesson/Cosine';
import { QuizView } from '../lesson/Quiz';
import { ThresholdScene } from '../lesson/Threshold';
import { StructureScene } from '../lesson/Structure';
import { TimelineScene } from '../lesson/Timeline';
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
    case 'concept':
      return <ConceptView block={block} />;
    case 'plot':
      return <PlotScene block={block} />;
    case 'derive':
      return <DeriveScene block={block} />;
    case 'scatter':
      return <ScatterScene block={block} />;
    case 'space':
      return <SpaceScene block={block} />;
    case 'cosine':
      return <CosineScene block={block} />;
    case 'compare':
      return <CompareScene block={block} />;
    case 'timeline':
      return <TimelineScene block={block} />;
    case 'structure':
      return <StructureScene block={block} />;
    // A chapter only means something in the lesson layout, which draws its header.
    case 'chapter':
    // The theme dresses the page and the slides; it draws nothing in the flow.
    case 'theme':
      return null;
  }
}
