import { Component, Input } from '@angular/core';
import { ApparatusEntryExponent, Attribute } from 'src/app/models/evt-models';
import { register } from 'src/app/services/component-register.service';

@register(ApparatusEntryExponent)
@Component({
  selector: 'evt-apparatus-entry-exponent',
  templateUrl: './apparatus-entry-exponent.component.html',
  styleUrls: ['./apparatus-entry-exponent.component.scss']
})
export class ApparatusEntryExponentComponent {
  @Input() data: ApparatusEntryExponent;
  shown: boolean;

  constructor(
  ) {
  }

  private get id(): Attribute {
    return this.data.id();
  }

  // onHover(isHovering: boolean) {
  //   // if (this.shown) return;

  //   const selection = document.getElementById('apparatus-exponent-selection');
  //   selection.innerHTML = '';

  //   // const rectsContainers = selection.querySelectorAll('[exponent-id]');
  //   // for (let container of Array.from(rectsContainers)) {
  //   //   const exponentId = container.getAttribute('exponent-id');
  //   //   if(!exponentId.includes(this.id.valueWithoutRef)) continue;

  //   //   container.remove();
  //   // }

  //   if (!isHovering) return;

  //   const from = this.data.from()
  //   const fromEl = this.data.requiresParentAsFrom() ? document.getElementById(this.id.valueWithoutRef).parentElement
  //     : document.getElementById(from.valueWithoutRef);
  //   const to = this.data.to();
  //   const toEl = document.getElementById(to.valueWithoutRef);

  //   const range = new Range();
  //   range.setStart(fromEl, 0);
  //   range.setEnd(toEl, 0);

  //   const rects = Array.from(range.getClientRects());
  //   // const rectsContainer = document.createElement('div');
  //   // rectsContainer.setAttribute('exponent-id', this.id.valueWithoutRef);

  //   for (let i = 0; i < rects.length; i++) {
  //     const rect = rects[i];

  //     let div = document.createElement('div');
  //     div.style.position = 'absolute';
  //     //div.style.backgroundColor = 'rgba(100,100,255,0.3)';
  //     div.style.textDecoration = "underline"
  //     div.style.top = rect.y + 'px';
  //     div.style.left = rect.x + 'px';
  //     div.style.height = rect.height + 'px';
  //     div.style.width = rect.width + 'px';
  //     div.style.zIndex = '1';

  //     // rectsContainer.appendChild(div);
  //     selection.appendChild(div);
  //   }
  //   // selection.appendChild(rectsContainer);
  // }

  onHover(isHovering: boolean) {
    const allEvtTexts = Array.from(document.querySelectorAll('evt-text'));
    if (!isHovering) {
      for (let evtText of allEvtTexts) {
        evtText = evtText as HTMLElement;
        evtText.classList.remove("text-decoration-underline");
      }
    }
    else {
      const from = this.data.from()
      const fromEl = this.data.requiresParentAsFrom() ? document.getElementById(this.id.valueWithoutRef).parentElement
        : document.getElementById(from.valueWithoutRef);
      const to = this.data.to();
      const toEl = document.getElementById(to.valueWithoutRef);

      for (let evtText of allEvtTexts) {
        evtText = evtText as HTMLElement;
        const isChildOfAppDetails = evtText.closest('evt-apparatus-entry-detail');
        if(isChildOfAppDetails) continue;

        const isAfterFrom = fromEl.compareDocumentPosition(evtText) & Node.DOCUMENT_POSITION_FOLLOWING;
        const isBeforeTo = evtText.compareDocumentPosition(toEl) & Node.DOCUMENT_POSITION_FOLLOWING;
        const isBetween = isAfterFrom && isBeforeTo;
        if (isBetween) {
          evtText.classList.add("text-decoration-underline")
        }
      }
    }
  }
}

