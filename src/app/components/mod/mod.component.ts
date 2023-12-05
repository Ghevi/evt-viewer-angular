import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';

import { EditorialConventionLayoutData } from 'src/app/directives/editorial-convention-layout.directive';
import { Mod } from 'src/app/models/evt-models';
import { register } from 'src/app/services/component-register.service';
import { EditionlevelSusceptible, Highlightable } from '../components-mixins';
import { distinctUntilChanged, scan, startWith, Subject } from 'rxjs';
import { EVTStatusService } from 'src/app/services/evt-status.service';

export interface ModComponent extends EditionlevelSusceptible, Highlightable { }

@Component({
  selector: 'evt-mod',
  templateUrl: './mod.component.html',
  styleUrls: ['./mod.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

@register(Mod)
export class ModComponent implements OnInit {

  @Input() data: Mod;

  public selLayer: string;
  public orderedLayers: string[];

  public isVisible = this.layerVisible;

  public opened = false;

  toggleOpened$ = new Subject<boolean | void>();
  opened$ = this.toggleOpened$.pipe(
    scan((currentState: boolean, val: boolean | undefined) => val === undefined ? !currentState : val, false),
    startWith(false),
  );

  get editorialConventionData(): EditorialConventionLayoutData {
    return {
      name: 'mod',
      attributes: this.data?.attributes || {},
      editionLevel: this.editionLevel,
      defaultsKey: 'mod',
    };
  }

  getLayerData(data) {
    this.orderedLayers = data?.layerOrder;
    this.selLayer = data?.selectedLayer;
  }

  layerVisible() {
    //console.log(this.selLayer, this.data)
    if (this.editionLevel !== 'critical') {
      if (this.data.hidden) {
        console.log('hidden');
        // changes not marked as lem are hidden if not in critical edition
        // todo: selectedLayer
        // todo: hide deleted text?
        return false;
      }
    }

    return true;
  }

  stopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }

  constructor(
    public evtStatusService: EVTStatusService,
  ) {}


  ngOnInit() {
    this.evtStatusService.currentChanges$.pipe(distinctUntilChanged()).subscribe(({ next: (data) => this.getLayerData(data) }));
  }

}