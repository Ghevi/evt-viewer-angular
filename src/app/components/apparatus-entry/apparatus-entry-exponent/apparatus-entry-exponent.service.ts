import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApparatusEntryExponentService {

  private evtTexts: HTMLElement[] = null;

  get allEvtTexts(): HTMLElement[] {
    if (!this.evtTexts) {
      this.evtTexts = Array.from(document.querySelectorAll('evt-text'));
    }
    return this.evtTexts;
  }
}
