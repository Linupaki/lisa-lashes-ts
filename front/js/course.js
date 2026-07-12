const API = 'http://localhost:3000';

async function loadCourses() {
  const container = document.getElementById('courses-container');
  try {
    const res = await fetch(API + '/courses');
    if (!res.ok) throw new Error(res.status);
    const courses = await res.json();

    if (!courses.length) {
      container.innerHTML = '<div style="text-align:center;padding:60px;color:#888;">No courses available at the moment. Check back soon.</div>';
      return;
    }

    container.innerHTML = courses.map(c => {
      const imgSrc = c.image_path
        ? `/front_admin/uploads/courses/${c.image_path}`
        : 'assets/images/course2.jpg';

      const dateStr = c.date
        ? new Date(c.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

      const timeStr = c.time_start && c.time_end
        ? `${c.time_start} – ${c.time_end}`
        : c.time_start || null;

      const details = [
        c.instructor ? `<li><strong>Master:</strong> ${esc(c.instructor)}</li>` : '',
        dateStr      ? `<li><strong>Date:</strong> ${dateStr}</li>`             : '',
        timeStr      ? `<li><strong>Time:</strong> ${esc(timeStr)}</li>`        : '',
        c.location   ? `<li><strong>Location:</strong> ${esc(c.location)}</li>` : '',
        c.spots      ? `<li><strong>Spots:</strong> Limited to ${c.spots} attendees</li>` : '',
        c.certificate ? `<li><strong>Certificate:</strong> Included</li>`       : '',
      ].filter(Boolean).join('');

      return `
        <div class="course">
          <div class="course-image">
            <img src="${imgSrc}" alt="${esc(c.title)}" onerror="this.src='assets/images/course2.jpg'">
          </div>
          <div class="course-info">
            <h2>${esc(c.title)}</h2>
            ${c.description ? `<p>${esc(c.description)}</p>` : ''}
            ${details ? `<ul>${details}</ul>` : ''}
            <div class="course-footer">
              <div class="price">€${Number(c.price).toFixed(2)}</div>
              <button class="book-btn" onclick="bookCourse(${c.id}, '${esc(c.title)}')">BOOK MASTERCLASS</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (e) {
    container.innerHTML = '<div style="text-align:center;padding:60px;color:#888;">Could not load courses. Please try again later.</div>';
  }
}

function bookCourse(id, title) {
  window.location.href = `course-checkout.html?id=${id}`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

loadCourses();
