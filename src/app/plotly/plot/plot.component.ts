import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    OnChanges,
    OnInit,
    Output,
    SimpleChange,
    SimpleChanges,
    ViewChild,
} from '@angular/core';

import { PlotlyService } from '../plotly.service';
import { NgClass } from '@angular/common';


@Component({
    selector: 'plotly-plot',
    template: `<div #plot [attr.id]="divId" [className]="className" [ngStyle]="style"></div>`,
    providers: [PlotlyService, { provide: Window, useFactory: () => window }],
})
export class PlotComponent implements OnInit, OnChanges, OnDestroy {

    @ViewChild('plot') plotEl: ElementRef;

    @Input() data?: Plotly.Data[];
    @Input() layout?: Partial<Plotly.Layout>;
    @Input() config?: Partial<Plotly.Config>;
    @Input() style?: { [key: string]: string };

    @Input() divId?: string;
    @Input() revision: number = 0;
    @Input() className?: string;
    @Input() debug: boolean = false;
    @Input() useResizeHandler: boolean = false;

    @Output() initialized = new EventEmitter<Plotly.Figure>();
    @Output() update = new EventEmitter<Plotly.Figure>();
    @Output() purge = new EventEmitter<Plotly.Figure>();
    @Output() error = new EventEmitter<Error>();

    public plotlyInstance: Plotly.PlotlyHTMLElement;
    public resizeHandler?: (instance: Plotly.PlotlyHTMLElement) => void;

    constructor(public plotly: PlotlyService, public window: Window) { }

    ngOnInit() {
        this.plotly.newPlot(this.plotEl.nativeElement, this.data, this.layout, this.config).then(plotlyInstance => {
            this.plotlyInstance = plotlyInstance;
            (this.window as any).gd = this.debug ? plotlyInstance : undefined;

            const figure = this.createFigure();
            this.initialized.emit(figure);
        }, err => {
            console.error('Error while plotting:', err);
            this.error.emit(err);
        });
    }

    ngOnDestroy() {
        if (typeof this.resizeHandler === 'function') {
            this.window.removeEventListener('resize', this.resizeHandler as any);
            this.resizeHandler = undefined;
        }

        const figure = this.createFigure();
        this.purge.emit(figure);
    }

    createFigure(): Plotly.Figure {
        const p: any = this.plotlyInstance;
        const figure: Plotly.Figure = {
            data: p.data,
            layout: p.layout,
            frames: p._transitionData ? p._transitionData._frames : null
        };

        return figure;
    }

    ngOnChanges(changes: SimpleChanges) {
        let shouldUpdate = false;

        const revision: SimpleChange = changes.revision;
        if (revision && !revision.isFirstChange()) {
            shouldUpdate = true;
        }

        const data: SimpleChange = changes.data;
        if (data && !data.isFirstChange()) {
            shouldUpdate = true;
        }

        const debug: SimpleChange = changes.debug;
        if (debug && !debug.isFirstChange()) {
            shouldUpdate = true;
        }

        if (shouldUpdate) {
            this.redraw();
        }

        this.updateWindowResizeHandler();
    }

    redraw() {
        if (!this.plotlyInstance) { throw new Error(`Plotly component wasn't initialized`); }
        this.plotly.plot(this.plotlyInstance, this.data, this.layout, this.config).then(plotlyInstance => {
            this.update.emit(this.createFigure());
            (this.window as any).gd = this.debug ? plotlyInstance : undefined;
        });
    }

    updateWindowResizeHandler() {
        if (this.useResizeHandler) {
            if (!this.resizeHandler) {
                this.resizeHandler = () => this.plotly.resize(this.plotlyInstance);
                this.window.addEventListener('resize', this.resizeHandler as any);
            }
        } else {
            if (typeof this.resizeHandler === 'function') {
                this.window.removeEventListener('resize', this.resizeHandler as any);
                this.resizeHandler = undefined;
            }
        }
    }

}
