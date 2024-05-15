import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkVirtualScrollable, ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, Subscription, concatMap, of } from 'rxjs';

type ScrollDirection = 'UP' | 'DOWN' | null;

@Component({
  selector: 'app-tree',
  standalone: true,
  imports: [ScrollingModule, CommonModule],
  templateUrl: './tree.component.html',
  styleUrl: './tree.component.css',
})
export class TreeComponent implements OnInit, AfterViewInit {
  loading: boolean = false;
  pageIndex: number = 0;
  readonly pageSize: number = 200;
  bufferSize: number = 50;
  worker!: Worker;
  items: any[] = [{ label: 'currently loading' }];
  prevScrollTop: number = 0;
  currentFilter: string | undefined;

  scrollDirection: ScrollDirection = 'DOWN';

  requestQueue: Subject<ScrollDirection> = new Subject();
  queueSubscription!: Subscription;

  // @ViewChild('scrollViewport') scrollViewport!: ElementRef;
  @ViewChild('scrollViewport') scrollViewport!: CdkVirtualScrollable;

  ngOnInit() {
    this.subscribeToQueue();
    this.loadData();
  }

  ngAfterViewInit() {
    this.attachScrollListener();
  }

  loadData() {
    this.worker = new Worker(new URL('./tree.worker', import.meta.url));
    this.worker.onmessage = ({ data }) => {
      this.loading = false;
      this.items = data;
      if (this.scrollDirection === 'DOWN') {
        this.scrollViewport.scrollTo({
          top: 1,
        });
      } else if (this.scrollDirection === 'UP') {
        this.scrollViewport.scrollTo({
          bottom: 1,
        });
      }
    };
    this.loading = true;
    this.worker.postMessage({
      action: 'GET_DATA',
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
    });
  }

  loadMoreData(direction: ScrollDirection) {
    console.log('loadMoreData', direction);
    this.scrollDirection = direction;
    if (this.scrollDirection === 'DOWN') {
      this.pageIndex += this.pageSize;
    } else if (this.pageIndex > 0) {
      this.pageIndex -= this.pageSize;
    } else {
      this.scrollDirection = null;
    }
    this.worker.postMessage({
      action: 'GET_DATA',
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      filter: this.currentFilter,
    });
  }

  subscribeToQueue(): void {
    this.queueSubscription = this.requestQueue
      .pipe(
        concatMap((e) => {
          this.loadMoreData(e);
          return of(true);
        })
      )
      .subscribe();
  }

  attachScrollListener() {
    this.scrollViewport.elementScrolled().subscribe((scrollEvent: Event) => {
      const { scrollHeight, scrollTop, clientHeight } =
        this.scrollViewport.getElementRef().nativeElement;

      if (scrollTop === 0) {
        this.requestQueue.next('UP');
      } else if (scrollHeight - scrollTop === clientHeight) {
        this.requestQueue.next('DOWN');
      }

      this.prevScrollTop = scrollTop;
    });
  }

  expandItem(item: any) {
    console.log('expand', item, this.items.indexOf(item));
    const newItems: any[] = [];
    this.items.forEach((i) => {
      newItems.push(i);
      if (i === item) {
        newItems.push(...item.children);
      }
    });
    this.items = newItems;
  }

  filter(e: any) {
    console.log('filterData', e.currentTarget.value);
    this.currentFilter = e.currentTarget.value;
    this.pageIndex = 0;
    this.loadMoreData('UP');
  }
}
