describe('QuietFlow smoke test', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('loads the app shell', () => {
    cy.get('[data-testid="sidebar-toggle-btn"]').should('be.visible');
  });

  it('switches between focus buckets', () => {
    // The bucket buttons have no data-testid, so select them by visible text.
    cy.get('[data-testid^="task-row-"]').should('have.length', 3);

    cy.contains('button', 'Now Only').click();
    cy.contains('button', 'Later / Backlog').click();

    // Round trip: "All Tasks" must bring the full list back.
    cy.contains('button', 'All Tasks').click();
    cy.get('[data-testid^="task-row-"]').should('have.length', 3);
  });

  it('completes a task by clicking its checkbox', () => {
    cy.get('[data-testid^="task-checkbox-"]').first().as('checkbox');
    cy.get('@checkbox').click();
    // A done task renders a checkmark <svg> inside its checkbox button.
    cy.get('@checkbox').find('svg').should('exist');
  });
});
