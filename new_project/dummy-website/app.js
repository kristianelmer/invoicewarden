const select = document.getElementById('jurisdiction');
const note = document.getElementById('jurisdiction-note');
select?.addEventListener('change', () => {
  if (select.value === 'uk') note.textContent = 'UK rules are active in v1.';
  if (select.value === 'ny') note.textContent = 'New York rules planned in v1.1.';
  if (select.value === 'ca') note.textContent = 'California rules planned in v1.2.';
});
