import { Component, Input, Output } from '@angular/core';
import { BehaviorSubject, combineLatest, merge, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, first, map, tap, withLatestFrom } from 'rxjs/operators';
import { Page,  ViewerDataType } from '../../models/evt-models';
import { EVTModelService } from '../../services/evt-model.service';
import { EvtLinesHighlightService  } from '../../services/evt-lines-highlight.service';

@Component({
  selector: 'evt-image-panel',
  templateUrl: './image-panel.component.html',
  styleUrls: ['./image-panel.component.scss'],
})
export class ImagePanelComponent {


  @Input() viewerData: ViewerDataType;

  @Input() pageID: string;

  @Input() showHeader = true;
  @Input() indipendentNavBar = false;
  // @Input() sync = false;
private _showSyncButton = true;
  @Input()
  public get showSyncButton() {
    return this._showSyncButton;
  }
  public set showSyncButton(value) {
    if (!value){
      this.isSyncButtonActive = '';
      this.linesHighlightService.syncTextImage$.next(false);
    }
    this._showSyncButton = value;
  }
  
  isSyncButtonActive: '' | 'active' = '';
  // public syncTextImage$ = new BehaviorSubject<boolean>(false);
  public currentPage$ = new BehaviorSubject<Page>(undefined);
  public currentPageId$ = this.currentPage$.pipe(
    map((p) => p?.id),
  );
  updatePageNumber$ = new Subject<number>();
  pageNumber$ = this.currentPageId$.pipe(
    withLatestFrom(this.evtModelService.pages$),
    map(([pageId, pages]) => pages.findIndex((page) => page.id === pageId)),
  );

  currentSurfaces$ = this.currentPageId$.pipe(
    tap((pageid)=>{
      console.log(' surfaces ', pageid);
    }),

    withLatestFrom(this.evtModelService.surfaces$),
    map(([pageId, surfaces]) => {
      console.log('elenco surfaces' , surfaces);

      return surfaces.find((surface) => surface.corresp === pageId);
    }),
    tap((s)=>{
      console.log(' surfaces ', s);
    }),
  );

  @Output() pageChange: Observable<Page> = merge(
    this.updatePageNumber$.pipe(
      filter((n) => n !== undefined),
      withLatestFrom(this.evtModelService.pages$),
      map(([n, pages]) => pages[n]),
    ),
    this.currentPage$.pipe(
      filter((p) => !!p),
      distinctUntilChanged(),
    ));

  currentMsDescId$ = new BehaviorSubject(undefined);
  currentMsDesc$ = combineLatest([this.evtModelService.msDesc$, this.currentMsDescId$]).pipe(
    filter(([msDesc, currentId]) => !!msDesc && !!currentId),
    map(([msDesc, currentId]) => msDesc.find((m) => m.id === currentId)),
  );

  msDescOpen = false;

  constructor(
    private evtModelService: EVTModelService,
     private linesHighlightService: EvtLinesHighlightService,
  ) {
  }

  syncTextImage() {
    
    this.isSyncButtonActive = this.isSyncButtonActive === 'active' ? '' : 'active';

    this.linesHighlightService.syncTextImage$.next(this.isSyncButtonActive === 'active');
    // this.syncTextImage$.next(this.sync);
    // if (this.sync) {
    //   this.isSyncButtonActive = 'active';
    // } else {
    //   this.isSyncButtonActive = '';
    // }
    // console.log(this.linesHighlightService.syncTextImage$.getValue());
  }

  updatePage(viewerPage: number) {
    this.updatePageNumber$.next(viewerPage > 0 ? viewerPage - 1 : 0);
  }

  setMsDescOpen(isOpen: boolean) {
    this.msDescOpen = isOpen;
  }

  setMsDescID(msDescId: string) {
    this.currentMsDescId$.next(msDescId);
  }

  onChangedCurrentPage(page:number) {
    this.evtModelService.pages$.pipe(
      map((pages) => page < 0 ? pages[pages.length - 1] : pages[page]),
      first(),
    ).subscribe(
      (currentPage:Page ) => {
          this.currentPage$.next(currentPage);
        },
      );
  }
}
