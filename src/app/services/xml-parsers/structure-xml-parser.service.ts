import { Injectable } from '@angular/core';
import { AppConfig } from '../../app.config';
import { ApparatusEntry, ApparatusEntryExponent, Attribute, DocumentApparatusEntries, EditionStructure, ElementApparatusEntries, GenericElement, OriginalEncodingNodeType, Page, XMLElement } from '../../models/evt-models';
import { deepSearch, getElementsBetweenTreeNode, isNestedInElem } from '../../utils/dom-utils';
import { GenericParserService } from './generic-parser.service';
import { getID, ParseResult } from './parser-models';
import { ParserRegister } from '.';
import { getFromAttributeOrDefault, getToAttributeOrDefault } from 'src/app/extensions/apparatus.extensions';
import { FROM_ATTRIBUTE, TO_ATTRIBUTE } from 'src/app/models/constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class StructureXmlParserService {
  constructor(
    private genericParserService: GenericParserService) {
  }

  private frontOrigContentAttr = 'document_front';
  readonly frontTagName = 'front';
  readonly pageTagName = AppConfig.evtSettings.edition.editionStructureSeparator;
  readonly bodyTagName = 'body';
  readonly backTagName = 'back';
  public backApps: XMLElement[] = [];

  private readonly appParser = ParserRegister.get('evt-apparatus-entry-parser');

  parsePages(el: XMLElement): EditionStructure {
    const editionStructure = { pages: [], documentApparatusEntries: new DocumentApparatusEntries() };
    if (!el) return editionStructure;

    const front: XMLElement = el.querySelector(this.frontTagName);
    const body: XMLElement = el.querySelector(this.bodyTagName);
    const back: XMLElement = el.querySelector(this.backTagName);

    const pbs = Array.from(el.querySelectorAll(this.pageTagName)).filter((p) => !p.getAttribute('ed'));
    const frontPbs = pbs.filter((p) => isNestedInElem(p, this.frontTagName));
    const bodyPbs = pbs.filter((p) => isNestedInElem(p, this.bodyTagName));
    const doc = el.firstElementChild.ownerDocument;

    if (frontPbs.length > 0 && bodyPbs.length > 0) {
      const pages = pbs.map((pb: XMLElement, idx, arr: XMLElement[]) => this.parseDocumentPage(doc, pb, arr[idx + 1], 'text'));
      editionStructure.pages.push(...pages);
      return editionStructure;
    }

    const frontPages = frontPbs.length === 0 && front && this.isMarkedAsOrigContent(front)
      ? [this.parseSinglePage(doc, front, 'page_front', this.frontTagName, 'facs_front')]
      : frontPbs.map((pb, idx, arr) => this.parseDocumentPage(doc, pb as HTMLElement, arr[idx + 1] as HTMLElement, this.frontTagName));

    const bodyPages = bodyPbs.length === 0
      ? [this.parseSinglePage(doc, body, 'page1', 'mainText', 'facs1')] // TODO: tranlsate mainText
      : bodyPbs.map((pb, idx, arr) => this.parseDocumentPage(doc, pb as HTMLElement, arr[idx + 1] as HTMLElement, this.bodyTagName));

    editionStructure.pages.push(...frontPages, ...bodyPages);

    this.backApps = back && Array.from(back.querySelectorAll("app"));
    if (this.backApps) {
      const result = this.getDocumentApparatusEntries(editionStructure.pages);
      result.apps.forEach((value, key) => {
        editionStructure.documentApparatusEntries.apps.set(key, value);
      });
    }

    let counter = 0;
    const enumerateBy = AppConfig.evtSettings.edition.exponentEnumerateBy;
    const enumeratedByElements = Array.from(el.querySelectorAll(enumerateBy));
    const enumeratedByJsonElements: string[] = [];
    for (let enumeratedByElement of enumeratedByElements) {
      const enumeratedByParsed = this.genericParserService.parse(enumeratedByElement as XMLElement);
      const enumerateByJson = JSON.stringify(enumeratedByParsed);
      enumeratedByJsonElements.push(enumerateByJson);
    }

    for (let i = 0; i < editionStructure.pages.length; i++) {
      const page = editionStructure.pages[i];
      this.addApparatusExponents(
        page.parsedContent,
        (app, exponent) => {
          const exponentId = exponent.id().valueWithoutRef;
          const pageAppEntries = editionStructure.documentApparatusEntries.apps.get(page.id);
          const elementAppEntries = pageAppEntries.apps.get(exponentId);
          if (elementAppEntries) {
            elementAppEntries.apps.push(app);
          }
          else {
            const elementAppEntries: ElementApparatusEntries = {
              elementId: exponentId,
              apps: [app]
            };
            pageAppEntries.apps.set(exponentId, elementAppEntries);
          }
        },
        () => {
          counter++;
          return counter.toString();
        },
        (item: GenericElement) => {
          const currentItemJson = JSON.stringify(item);
          const matchesSelector = enumeratedByJsonElements.some(x => x === currentItemJson);
          if (enumerateBy !== 'global' && matchesSelector) {
            counter = 0;
          }
        }
      )
    }

    return editionStructure;
  }

  /**
   * This function adds the apparatus exponents based on many different cases
   * for inline and standoff apparatuses.
   * 
   * @param items the items to be processed
   * @param onApparatusEntryReplaced callback for adding apparatus entries
   */
  addApparatusExponents(
    items: any[],
    onApparatusEntryReplaced: (app: ApparatusEntry, exponent: ApparatusEntryExponent) => void,
    getExponentLabel: () => string,
    onShouldResetCounter: (item: GenericElement) => void,
  ) {

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      onShouldResetCounter(item);

      if (item.type?.name === 'ApparatusEntry') {
        const app = item as ApparatusEntry;
        if (!app) throw new Error("Invalid type " + app);

        const id = this.getExponentId();
        const from = null; // it should be the parent element but such parent might have no xml:id. 
        const to = id; // to itself as the end element
        const exponent = ApparatusEntryExponent.create(id, from, to, getExponentLabel(), [app]);
        items[i] = exponent;
        onApparatusEntryReplaced(item, exponent);
      }
      else if (item.type?.name === 'Anchor') {
        const anchorId = item.attributes['id'];
        const app = this.getApparatusEntryOrDefault(anchorId);
        if (!app) {
          console.warn("This anchor has not apparatus entry associated with its id and will be skipped", item);
          continue;
        }

        const appFrom = Attribute.createOrDefault(app.attributes[FROM_ATTRIBUTE]);
        if (!appFrom) {
          throw new Error(`A standoff apparatus entry must have a valid ${FROM_ATTRIBUTE} attribute`);
        }

        const appTo = Attribute.createOrDefault(app.attributes[TO_ATTRIBUTE]);
        const isToAnchor = appTo && appTo.equals(anchorId);
        if (!isToAnchor) {
          console.log("This anchor will be skipped because is the starting anchor, exponent will be place on the ending anchor", item);
          continue;
        }

        const id = this.getExponentId();
        const exponent = ApparatusEntryExponent.create(id, appFrom.valueWithoutRef, appTo.valueWithoutRef, getExponentLabel(), [app]);
        // insert at index
        items.splice(i + 1, 0, exponent);
      }
      else if (item.type?.name === 'ApparatusEntryExponent') {
        console.log("The element is an exponent, skipping", item);
        continue;
      }
      else if (item.content) {
        // recursive check for nested entries
        this.addApparatusExponents(item.content, onApparatusEntryReplaced, getExponentLabel, onShouldResetCounter);

        // now check if the item itself has an apparatus entry and add it's exponent as last child
        const itemId = item.attributes['id'];
        const app = this.getApparatusEntryOrDefault(itemId);
        if (!app) {
          console.log("This item has no apparatus entry, skipping", item);
          continue;
        }

        const exponentId = this.getExponentId();
        const appFrom = Attribute.createOrDefault(app.attributes[FROM_ATTRIBUTE]);
        const appTo = Attribute.createOrDefault(app.attributes[TO_ATTRIBUTE]);
        const isToElement = appTo && appTo.valueWithoutRef === itemId
        if (isToElement) {
          const from = appFrom.valueWithoutRef;
          const to = exponentId; // the exponent will be the To element itself since is placed as next sibling of the current item
          const exponent = ApparatusEntryExponent.create(exponentId, from, to, getExponentLabel(), [app]);
          items.splice(i + 1, 0, exponent); // insert as sibling because this component is not an anchor
          i++; // skipping the exponent that has just been added saves one loop
        }
        else if (!appTo) {
          const from = itemId; // from itself since the apparatus entry refer to it
          const to = exponentId; // the exponent will be place as the last child of the element so it marks the end
          const exponent = ApparatusEntryExponent.create(exponentId, from, to, getExponentLabel(), [app]);
          item.content.push(exponent);
        }
      }
      else {
        console.log('Node is not of interest for apparatus processing', item);
      }
    }
  }

  private getExponentId(): string {
    const uuid = uuidv4();
    return 'app-exponent-' + uuid;
  }

  private getApparatusEntryOrDefault(id: string): ApparatusEntry | null {
    if (!id) return null;

    const backAppsData = this.getBackAppsData();
    const appData = backAppsData.find(x => x.appFrom?.valueWithoutRef === id || x.appTo?.valueWithoutRef === id);
    if (!appData) return null;

    const app = this.appParser.parse(appData.app)
    return app as ApparatusEntry;
  }

  private getDocumentApparatusEntries(pages: Page[]): DocumentApparatusEntries {
    const backAppsData = this.getBackAppsData();

    const searchValues = backAppsData.map(x => x.appTo ?? x.appFrom).map(x => x.valueWithoutRef);
    const searchAttribute = "id";
    const attributesNotIncludedInSearch = ['originalEncoding', 'type', 'spanElements', 'includedElements'];

    const documentApparatusEntries = new DocumentApparatusEntries();
    for (const page of pages) {
      const elementAppEntries: Map<string, ElementApparatusEntries> = new Map();
      documentApparatusEntries.apps.set(page.id, {
        pageId: page.id,
        apps: elementAppEntries
      });

      const searchResults = deepSearch(page.parsedContent, searchAttribute, searchValues, 4000, attributesNotIncludedInSearch);
      for (const result of searchResults) {
        const element = result as GenericElement;
        if (!element) continue;

        const elementId = element.attributes[searchAttribute];
        const elementApps = backAppsData.filter(x => x.appFrom?.equals(elementId) || x.appTo?.equals(elementId));
        if (elementApps.length) {
          const parsedApps = elementApps.map(x => this.appParser.parse(x.app) as ApparatusEntry);
          elementAppEntries.set(elementId, {
            elementId,
            apps: parsedApps
          });
        }
      }
    }
    return documentApparatusEntries;
  }

  private getBackAppsData(): { app: HTMLElement, appFrom: Attribute, appTo: Attribute }[] {
    return this.backApps
      .map(app => {
        const appFrom = Attribute.createOrDefault(getFromAttributeOrDefault(app));
        const appTo = Attribute.createOrDefault(getToAttributeOrDefault(app));

        if (!appFrom && !appTo) {
          console.error("errored app", app);
          throw new Error(`An apparatus inside 'back' tag, must have a ${FROM_ATTRIBUTE} or ${TO_ATTRIBUTE}`);
        }
        return {
          app,
          appFrom,
          appTo,
        };
      });
  }

  parseDocumentPage(doc: Document, pb: XMLElement, nextPb: XMLElement, ancestorTagName: string): Page {
    /* If there is a next page we retrieve the elements between two page nodes
    otherweise we retrieve the nodes between the page node and the last node of the body node */
    // TODO: check if querySelectorAll can return an empty array in this case
    const nextNode = nextPb || Array.from(doc.querySelectorAll(ancestorTagName)).reverse()[0].lastChild;
    const originalContent = getElementsBetweenTreeNode(pb, nextNode)
      .filter((n) => n.tagName !== this.pageTagName)
      .filter((c) => ![4, 7, 8].includes(c.nodeType)); // Filter comments, CDATAs, and processing instructions

    return {
      id: getID(pb, 'page'),
      label: pb.getAttribute('n') || 'page',
      facs: (pb.getAttribute('facs') || 'page').split('#').slice(-1)[0],
      originalContent,
      parsedContent: this.parsePageContent(doc, originalContent),
      url: this.getPageUrl(getID(pb, 'page')),
      facsUrl: this.getPageUrl((pb.getAttribute('facs') || getID(pb, 'page')).split('#').slice(-1)[0]),
    };
  }

  private parseSinglePage(doc: Document, el: XMLElement, id: string, label: string, facs: string): Page {
    const originalContent: XMLElement[] = getElementsBetweenTreeNode(el.firstChild, el.lastChild);

    return {
      id,
      label,
      facs,
      originalContent,
      parsedContent: this.parsePageContent(doc, originalContent),
      url: this.getPageUrl(id),
      facsUrl: this.getPageUrl(facs || id),
    };
  }

  private getPageUrl(id) {
    // TODO: check if exists <graphic> element connected to page and return its url
    // TODO: handle multiple version of page
    const image = id.split('.')[0];

    //Nel file_config imagesFolderUrls deve terminare già con uno /
    return `${AppConfig.evtSettings.files.imagesFolderUrls.single}${image}.jpg`;
  }
  // lbId = '';
  // quando trovi un lbId allora lbId = 'qualcosa'


  parsePageContent(doc: Document, pageContent: OriginalEncodingNodeType[]): Array<ParseResult<GenericElement>> {
    return pageContent
      .map((node) => {

        //const origEl = getEditionOrigNode(node, doc);
        // issue #228
        // the original line is commented because this function causes the node to be revered at its original state
        // before the pb division, see issue #228 details for further info.
        // for now this quick fix allows a proper text division but we need to investigate exceptions and particular cases
        const origEl = node;

        if (origEl.nodeName === this.frontTagName || isNestedInElem(origEl, this.frontTagName)) {
          if (this.hasOriginalContent(origEl)) {
            return Array.from(origEl.querySelectorAll(`[type=${this.frontOrigContentAttr}]`))
              .map((c) => this.genericParserService.parse(c as XMLElement));
          }
          if (this.isMarkedAsOrigContent(origEl)) {
            return [this.genericParserService.parse(origEl)];
          }

          return [] as Array<ParseResult<GenericElement>>;
        }

        if (origEl.tagName === 'text' && origEl.querySelectorAll && origEl.querySelectorAll(this.frontTagName).length > 0) {
          return this.parsePageContent(doc, Array.from(origEl.children) as HTMLElement[]);
        }

        return [this.genericParserService.parse(origEl)];
      })
      .reduce((x, y) => x.concat(y), []);
  }

  hasOriginalContent(el: XMLElement): boolean {
    return el.querySelectorAll(`[type=${this.frontOrigContentAttr}]`).length > 0;
  }

  isMarkedAsOrigContent(el: XMLElement): boolean {
    return el.nodeType !== 3 &&
      (el.getAttribute('type') === this.frontOrigContentAttr ||
        this.hasOriginalContent(el) ||
        isNestedInElem(el, '', [{ key: 'type', value: this.frontOrigContentAttr }])
      );
  }
}



/* this function is only momentarily commented, waiting for issue #228 to be better addressed
function getEditionOrigNode(el: XMLElement, doc: Document) {
  if (el.getAttribute && el.getAttribute('xpath')) {
    const path = doc.documentElement.namespaceURI ? el.getAttribute('xpath').replace(/\//g, '/ns:') : el.getAttribute('xpath');
    const xpathRes = doc.evaluate(path, doc, createNsResolver(doc), XPathResult.ANY_TYPE, undefined);

    return xpathRes.iterateNext() as XMLElement;
  }

  return el;
}
*/
