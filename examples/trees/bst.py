"""A binary search tree: smaller values go left, the others go right."""


class Node:
    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None


def insert(root, value):
    """Puts value in its place below root and returns the root."""
    if root is None:
        return Node(value)
    if value < root.value:
        root.left = insert(root.left, value)
    else:
        root.right = insert(root.right, value)
    return root


def height(root):
    """Levels from the root down to the deepest leaf."""
    if root is None:
        return 0
    return 1 + max(height(root.left), height(root.right))


if __name__ == "__main__":
    tree = None
    for value in [50, 30, 70, 20, 40]:
        tree = insert(tree, value)
    print("height:", height(tree))

    line = None
    for value in [20, 30, 40, 50, 70]:
        line = insert(line, value)
    print("height when sorted:", height(line))
