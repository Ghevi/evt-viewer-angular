/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, Input, OnInit } from '@angular/core';
import { EVTStatusService } from '../../services/evt-status.service';
import { map, merge, Observable } from 'rxjs';
import { ApparatusEntry } from 'src/app/models/evt-models';
import { EVTModelService } from 'src/app/services/evt-model.service';

@Component({
  selector: 'evt-critical-apparatus',
  templateUrl: './critical-apparatus.component.html',
  styleUrls: ['./critical-apparatus.component.scss'],
})
export class CriticalApparatusComponent implements OnInit {
  @Input() pageID: string;

  private appClasses = ['app'];
  private apparatusInCurrentPage = this.evtStatusService.getPageElementsByClassList(this.appClasses)
  public entries$: Observable<ApparatusEntry[]>;

  stopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }

  constructor(
    private evtStatusService: EVTStatusService,
    private evtModelService: EVTModelService,
  ) { }

  ngOnInit(): void {
    this.entries$ = merge(
      this.apparatusInCurrentPage.pipe(
        map(data => data.flat())
      ),
      this.evtModelService.getPageApparatusOrDefault(this.pageID),
    );
  }
}
