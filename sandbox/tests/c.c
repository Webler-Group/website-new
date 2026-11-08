#include <stdio.h>
#include <math.h>
int main(void) {
    char name[64];
    if (scanf("%63s", name) != 1) return 1;
    printf("hello %s %.3f\n", name, sqrt(2.0));
    return 0;
}
