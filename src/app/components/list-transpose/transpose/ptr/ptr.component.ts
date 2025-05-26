import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Attribute, Ptr } from 'src/app/models/evt-models';
import { EVTStatusService } from 'src/app/services/evt-status.service';
import { GenericParserService } from 'src/app/services/xml-parsers/generic-parser.service';

@Component({
  selector: 'evt-ptr',
  templateUrl: './ptr.component.html',
  styleUrls: ['./ptr.component.scss']
})
export class PtrComponent implements OnInit, OnDestroy {
  @Input() data: Ptr;

  private subs: Subscription;

  constructor(
    private statusService: EVTStatusService,
    private parserService: GenericParserService
  ) { }

  ngOnInit(): void {
    this.subs = this.statusService.currentPage$.subscribe(page => {
      page.originalContent.flatMap(x => {
        if(this.data.content.length) return;

        const target = Attribute.create(this.data.attributes['target']);
        const element = x.querySelector(`[*|id='${target.valueWithoutRef}']`);
        if (element) {
          const content = this.parserService.parse(element as HTMLElement);
          this.data.content = [content];
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.subs?.unsubscribe();
  }

}
