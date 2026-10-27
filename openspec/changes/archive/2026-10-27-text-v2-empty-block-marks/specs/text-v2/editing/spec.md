## ADDED Requirements

### Requirement: Empty item keeps marks
Enter in a list item SHALL create a new item whose marker and empty line immediately use the previous item's marks (except `link`). Outdenting an empty item SHALL keep its marks. Enter on an empty item that exits the list SHALL clear them.

#### Scenario: New bullet
- **WHEN** Enter is pressed at the end of a bullet with size 2
- **THEN** the new bullet's marker and empty line render at size 2 with no jump on typing

#### Scenario: Outdent
- **WHEN** an empty item with marks is outdented
- **THEN** its marks are kept

#### Scenario: Exit list
- **WHEN** Enter is pressed in an empty item with marks
- **THEN** the block becomes a plain paragraph without `m`
