import { Component, Input, OnInit } from '@angular/core';
import { Transpose } from 'src/app/models/evt-models';
import { register } from 'src/app/services/component-register.service';

@Component({
  selector: 'evt-transpose',
  templateUrl: './transpose.component.html',
  styleUrls: ['./transpose.component.scss']
})
@register(Transpose)
export class TransposeComponent implements OnInit {
  @Input() data: Transpose;

  constructor() { }

  ngOnInit(): void {
  }

}
