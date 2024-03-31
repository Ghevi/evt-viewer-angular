import { Component, Input } from '@angular/core';

import { Mod, Reading } from 'src/app/models/evt-models';
import { EditionlevelSusceptible, Highlightable, ShowDeletionsSusceptible, TextFlowSusceptible } from '../../components-mixins';
import { ChangeDetectionStrategy } from '@angular/core';
import { AppConfig, EditionLevelType } from 'src/app/app.config';
import { BehaviorSubject, distinctUntilChanged, map, scan, startWith, Subject } from 'rxjs';
import { EVTStatusService } from 'src/app/services/evt-status.service';

export interface ModGroupComponent extends EditionlevelSusceptible, Highlightable, TextFlowSusceptible, ShowDeletionsSusceptible { }

@Component({
  selector: 'evt-mod-group',
  templateUrl: './mod-group.component.html',
  styleUrls: ['../mod-detail/mod-detail.component.scss','../../sources/sources.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})

export class ModGroupComponent {

  public changeSeparatorVisible = AppConfig.evtSettings.edition.showSeparatorBetweenChanges;

  public edLevel: EditionLevelType;
  public mods: Mod[];

  public orderedLayers: string[];
  public reversedLayers: string[];

  public selLayer: string;

  public opened = false;

  toggleOpened$ = new Subject<boolean | void>();
  opened$ = this.toggleOpened$.pipe(
    scan((currentState: boolean, val: boolean | undefined) => val === undefined ? !currentState : val, false),
    startWith(false),
  );

  public reversedLayers$ = this.evtStatusService.currentChanges$.pipe(
    distinctUntilChanged(),
    map(({ layerOrder }) => {
      this.orderedLayers = layerOrder;
      this.reversedLayers = layerOrder.slice().reverse();

      return layerOrder.slice().reverse();
    } ),
  );

  @Input() withDeletions: boolean;

  @Input() orderedReadings: Reading[]

  @Input() set selectedLayer(layer: string) {
    this.selLayer = layer;
  }
  get selectedLayers() { return this.selLayer; }

  @Input() set modGroup(el: Mod[]) {
    this.mods = el;
  }
  get modGroup() { return this.mods; }

  @Input() set editionLevel(el: EditionLevelType) {
    this.edLevel = el;
    this.editionLevelChange.next(el);
  }
  get editionLevel() { return this.edLevel; }
  editionLevelChange = new BehaviorSubject<EditionLevelType | ''>('');

  @Input() containerElement;

  stopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }

  getLayerIndex(layer): number {
    if (layer) {
      layer = layer.replace('#','');

      return this.orderedLayers.indexOf(layer);
    }

    return 0;

  }

  toggleModGroupEntryBox() {
    this.opened = !this.opened;
  }

  constructor(
    public evtStatusService: EVTStatusService,
  ) {}

}
