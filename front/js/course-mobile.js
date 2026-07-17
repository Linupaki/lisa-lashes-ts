const API = window.location.origin;

let courseUiBound = false;

function bindCourseMobileUI() {
  if (courseUiBound) return;
  courseUiBound = true;

  const container = document.getElementById('courses-container');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('button[data-course-id]') : null;
    if (!btn) return;
    const id = Number(btn.getAttribute('data-course-id'));
    if (!id) return;
    bookCourse(id);
  });
}

async function loadCourses() {
  const container = document.getElementById('courses-container');
  if (!container) return;

  try {
    const res = await fetch(API + '/courses', { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const courses = await res.json();

    if (!Array.isArray(courses) || courses.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px 0;color:#888;">No courses available at the moment. Check back soon.</div>';
      return;
    }

    container.innerHTML = courses
      .map((c) => {
        const imgSrc = c.image_path
          ? `/front_admin/uploads/courses/${esc(c.image_path)}`
          : 'assets/images/course2.jpg';

        const dateStr = c.date
          ? new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : null;

        const timeStr = c.time_start && c.time_end
          ? `${c.time_start} – ${c.time_end}`
          : c.time_start || null;

        const details = [
          c.instructor ? `<li><strong>Master:</strong> ${esc(c.instructor)}</li>` : '',
          dateStr ? `<li><strong>Date:</strong> ${esc(dateStr)}</li>` : '',
          timeStr ? `<li><strong>Time:</strong> ${esc(timeStr)}</li>` : '',
          c.location ? `<li><strong>Location:</strong> ${esc(c.location)}</li>` : '',
          c.spots ? `<li><strong>Spots:</strong> Limited to ${Number(c.spots)} attendees</li>` : '',
          c.certificate ? `<li><strong>Certificate:</strong> Included</li>` : '',
        ]
          .filter(Boolean)
          .join('');

        return `
          <div class="course">
            <div class="course-image">
              <img data-fallback-src="assets/images/course2.jpg" src="${imgSrc}" alt="${esc(c.title || '')}">
            </div>

            <div class="course-info">
              <h2>${esc(c.title || 'Course')}</h2>
              ${c.description ? `<p>${esc(c.description)}</p>` : ''}
              ${details ? `<ul>${details}</ul>` : ''}

              <div class="course-footer">
                <div class="price">€${Number(c.price || 0).toFixed(2)}</div>
                <button class="book-btn" type="button" data-course-id="${Number(c.id)}">BOOK MASTERCLASS</button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('img[data-fallback-src]').forEach((img) => {
      img.addEventListener('error', () => {
        const fb = img.getAttribute('data-fallback-src');
        if (fb && img.src !== fb) img.src = fb;
      }, { once: true });
    });
  } catch (e) {
    container.innerHTML = '<div style="text-align:center;padding:40px 0;color:#888;">Could not load courses. Please try again later.</div>';
  }
}

function bookCourse(id) {
  window.location.href = `course-checkout-mobile.html?id=${id}`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  bindCourseMobileUI();
  loadCourses();
});
