'use client';

import { useAdmin } from '@/components/admin/AdminProvider';
import { SampleDataNotice } from '@/components/admin/SampleDataNotice';
import styles from './AdminReviews.module.css';

const DATE_FORMAT = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(`${iso}T12:00:00`));
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className={styles.stars}>
      <span aria-hidden="true">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
      <span className="sr-only">Rated {rating} out of 5 stars</span>
    </span>
  );
}

export function AdminReviews() {
  const { reviews, setReviewStatus } = useAdmin();

  return (
    <div className={styles.page}>
      <p className="kicker">Feedback</p>
      <h1 className={styles.title}>Reviews</h1>

      <SampleDataNotice>
        These {reviews.length} reviews are fabricated for this demo, referencing real catalog
        products — no real reviews have been collected in this build.
      </SampleDataNotice>

      <ul className={styles.list}>
        {reviews.map((r) => {
          const published = r.status === 'Published';
          return (
            <li key={r.id} className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <p className={styles.author}>{r.author}</p>
                  <p className={styles.meta}>{r.productName} · {formatDate(r.date)}</p>
                </div>
                <Stars rating={r.rating} />
              </div>

              <p className={styles.comment}>&quot;{r.comment}&quot;</p>

              <button
                type="button"
                className={styles.toggle}
                data-published={published}
                aria-pressed={published}
                onClick={() => setReviewStatus(r.id, published ? 'Hidden' : 'Published')}
              >
                <span className={styles.toggleDot} aria-hidden="true" />
                {published ? 'Published — hide' : 'Hidden — approve'}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
