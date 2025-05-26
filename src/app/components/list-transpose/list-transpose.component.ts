import { Component, Input, OnInit } from '@angular/core';
import { ListTranspose } from 'src/app/models/evt-models';
import { register } from 'src/app/services/component-register.service';

@Component({
  selector: 'evt-list-transpose',
  templateUrl: './list-transpose.component.html',
  styleUrls: ['./list-transpose.component.scss']
})
@register(ListTranspose)
export class ListTransposeComponent implements OnInit {
  @Input() data: ListTranspose;

  constructor() { }

  ngOnInit(): void {
  }

}
