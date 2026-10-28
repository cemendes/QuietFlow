describe('QuietFlow smoke test', () => {
  beforeEach(() => {
    cy.visit('/');
    // The app opens on the Notes section; these checks are about the task list.
    cy.get('[data-testid="section-tab-tasks"]').click();
  });

  it('loads the app shell', () => {
    cy.get('[data-testid="sidebar-toggle-btn"]').should('be.visible');
  });

  it('lands on the grid of task lists, never on notes', () => {
    // Mock vault: Tarefas/ holds Inbox, today and Customers/{Acme Corp, Beta Health}.
    cy.get('[data-testid="tasks-home"]').should('be.visible');
    cy.get('[data-testid="task-list-card"]').should('have.length', 4);
    cy.get('[data-testid="task-list-card"]').first().should('contain.text', 'Inbox');
    cy.contains('[data-testid="task-list-card"]', 'Ideias de projeto').should('not.exist');
  });

  describe('inside a task list', () => {
    beforeEach(() => {
      // Tasks now lands on its grid; open the seeded "today" list to reach its tasks.
      cy.contains('[data-testid="task-list-card"]', 'today').click();
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

    it('goes back to the grid', () => {
      cy.get('[data-testid="back-to-lists-btn"]').click();
      cy.get('[data-testid="tasks-home"]').should('be.visible');
    });
  });
});
