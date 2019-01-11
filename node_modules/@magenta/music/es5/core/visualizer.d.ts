import { INoteSequence, NoteSequence } from '../protobuf';
interface VisualizerConfig {
    noteHeight?: number;
    noteSpacing?: number;
    pixelsPerTimeStep?: number;
    noteRGB?: string;
    activeNoteRGB?: string;
    minPitch?: number;
    maxPitch?: number;
}
export declare class Visualizer {
    private config;
    private ctx;
    private height;
    noteSequence: INoteSequence;
    private sequenceIsQuantized;
    private parentElement;
    constructor(sequence: INoteSequence, canvas: HTMLCanvasElement, config?: VisualizerConfig);
    redraw(activeNote?: NoteSequence.INote, scrollIntoView?: boolean): number;
    private getCanvasSize;
    private getNoteStartTime;
    private getNoteEndTime;
    private isPaintingActiveNote;
}
export {};
