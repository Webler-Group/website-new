#include <iostream>
#include <string>
#include <fmt/core.h>
#include <Eigen/Dense>
#include <boost/algorithm/string.hpp>
#include <glm/glm.hpp>
#include <GL/osmesa.h>
#include <GL/gl.h>
#include <vector>

int main() {
    std::string name;
    std::getline(std::cin, name);
    boost::algorithm::trim(name);

    Eigen::Matrix2d m; m << 2, 1, 1, 3;
    glm::vec3 v(1, 2, 2);

    // Offscreen software rendering via OSMesa
    OSMesaContext ctx = OSMesaCreateContext(OSMESA_RGBA, nullptr);
    std::vector<unsigned char> buf(64 * 64 * 4);
    bool gl = ctx && OSMesaMakeCurrent(ctx, buf.data(), GL_UNSIGNED_BYTE, 64, 64);
    if (gl) { glClearColor(1, 0, 0, 1); glClear(GL_COLOR_BUFFER_BIT); glFinish(); }

    fmt::print("hello {} det={} len={} gl={}\n", name, m.determinant(), glm::length(v),
               gl ? (const char*)glGetString(GL_RENDERER) : "none");
    if (ctx) OSMesaDestroyContext(ctx);
}
