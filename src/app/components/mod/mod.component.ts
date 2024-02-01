import { Component, Input } from '@angular/core';

import { EditorialConventionLayoutData } from 'src/app/directives/editorial-convention-layout.directive';
import { ChangeLayerData, Mod, Note } from 'src/app/models/evt-models';
import { register } from 'src/app/services/component-register.service';
import { EditionlevelSusceptible, Highlightable, ShowDeletionsSusceptible, TextFlowSusceptible } from '../components-mixins';
import { distinctUntilChanged, map, scan, startWith, Subject } from 'rxjs';
import { EVTStatusService } from 'src/app/services/evt-status.service';
import { AppConfig } from 'src/app/app.config';
import { ChangeDetectionStrategy } from '@angular/core';

export interface ModComponent extends EditionlevelSusceptible, Highlightable, TextFlowSusceptible, ShowDeletionsSusceptible { }

@Component({
  selector: 'evt-mod',
  templateUrl: './mod.component.html',
  styleUrls: ['./mod.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})

@register(Mod)
export class ModComponent {

  @Input() data: Mod;

  @Input() editionLevel;

  @Input() withDeletions;

  public alwaysShow: boolean;

  @Input() set alwaysShown(yes: boolean) {
    this.alwaysShow = yes;
  }
  get alwaysShown() { return this.alwaysShow; }

  public changeSeparatorVisible = AppConfig.evtSettings.edition.showSeparatorBetweenChanges;

  public showLayerMarkers = AppConfig.evtSettings.edition.showChangeLayerMarkerInText;

  public elementsToExcludeInTextFlow = [Note];

  public orderedLayers: string[];

  public selectedLayer: string;

  public selectedLayer$ = this.evtStatusService.currentChanges$.pipe(
    distinctUntilChanged(),
    map(({ selectedLayer }) => {
      this.selectedLayer = selectedLayer;

      return selectedLayer;
    } ),
  );


  public opened = false;

  public isHidden = this.layerHidden;

  public changeLayerColor = this.getLayerColor;

  toggleOpened$ = new Subject<boolean | void>();
  opened$ = this.toggleOpened$.pipe(
    scan((currentState: boolean, val: boolean | undefined) => val === undefined ? !currentState : val, false),
    startWith(false),
  );

  get editorialConventionData(): EditorialConventionLayoutData {
    return {
      name: 'mod',
      attributes: this.data?.attributes || {},
      editionLevel: this.editionLevel || 'diplomatic',
      defaultsKey: 'mod',
    };
  }

  getLayerData(data: ChangeLayerData) {
    this.orderedLayers = data?.layerOrder;
    this.selectedLayer = data?.selectedLayer;
  }

  getLayerColor() {
    const layerColors = AppConfig.evtSettings.edition.changeSequenceView.layerColors;
    if ((this.data?.changeLayer) && (layerColors[this.data.changeLayer.replace('#','')])) {
      return layerColors[this.data.changeLayer.replace('#','')];
    }

    return null;
  }

  getLayerIndex(layer): number {
    layer = layer.replace('#','');

    return this.orderedLayers.indexOf(layer);
  }

  layerHidden(subEl): boolean {
    if (this.editionLevel !== 'changesView') {
      return false;
    }
    this.evtStatusService.currentChanges$.subscribe(({ next: (data) => this.getLayerData(data) }));
    if ((this.selectedLayer !== undefined) && (this.data.changeLayer !== undefined)) {
      // we are always showing deletions regardless of mod change layer
      if (!this.data.insideApp[0] && subEl.class === 'del') {
        return false;
      }
      // generic content managament
      if (this.getLayerIndex(this.selectedLayer) < this.getLayerIndex(this.data.changeLayer)) {
        return true;
      }
    }

    return false;
  }

  stopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }

  constructor(
    public evtStatusService: EVTStatusService,
  ) {}


}