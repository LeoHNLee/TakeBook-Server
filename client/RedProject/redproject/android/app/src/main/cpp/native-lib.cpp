#include <jni.h>
#include <string>
#include <opencv2/opencv.hpp>

using namespace cv;

extern "C"
JNIEXPORT void JNICALL
Java_com_ff0000_redproject_CameraActivity_detectEdgeJNI(JNIEnv *env, jobject instance,
                                                      jlong inputImage, jlong outputImage, jint th1,
                                                      jint th2) {

    // TODO
    Mat &inputMat = *(Mat *) inputImage;
    Mat &outputMat = *(Mat *) outputImage;

    cvtColor(inputMat, outputMat, COLOR_RGB2GRAY);
    Canny(outputMat, outputMat, th1, th2);
}

extern "C"
JNIEXPORT void JNICALL
Java_com_ff0000_redproject_CameraActivity_ConvertRGBtoGray(JNIEnv *env, jobject instance,
                                                           jlong matAddrInput,
                                                           jlong matAddrResult) {

    // TODO
    Mat &inputMat = *(Mat *) matAddrInput;
    Mat &outputMat = *(Mat *) matAddrResult;

    cvtColor(inputMat, outputMat, COLOR_RGB2GRAY);

}

extern "C"
JNIEXPORT void JNICALL
Java_com_ff0000_redproject_CameraActivity_minus(JNIEnv *env, jobject instance, jlong firstImage,
                                                jlong secondImage, jint alpha) {

    // TODO
    Mat &firstMat = *(Mat *) firstImage;
    Mat &secondMat = *(Mat *) secondImage;

    int width = firstMat.cols;
    int height = firstMat.rows;

    for (int y = 0; y < height; y++) {

        for (int x = 0; x < width; x++) {

            cv::Vec3b firstVector = firstMat.at<cv::Vec3b>(y,x);
            cv::Vec3b secondVector = secondMat.at<cv::Vec3b>(y,x);

            int redDiff = (alpha + 1) * firstVector[0] - alpha * secondVector[0];
            int greenDiff = (alpha + 1) * firstVector[1] - alpha * secondVector[1];
            int blueDiff = (alpha + 1) * firstVector[2] - alpha * secondVector[2];

            if(redDiff < 0) redDiff = 0;
            if(greenDiff < 0) greenDiff = 0;
            if(blueDiff < 0) blueDiff = 0;

            firstVector[0] = cv::saturate_cast<uchar>( redDiff );
            firstVector[1] = cv::saturate_cast<uchar>( greenDiff );
            firstVector[2] = cv::saturate_cast<uchar>( blueDiff );

            firstMat.at<cv::Vec3b>(y,x) = firstVector;
        }
    }

}