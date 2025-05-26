import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListTransposeComponent } from './list-transpose.component';

describe('ListTransposeComponent', () => {
  let component: ListTransposeComponent;
  let fixture: ComponentFixture<ListTransposeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListTransposeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ListTransposeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
