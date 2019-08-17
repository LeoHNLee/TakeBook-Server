package com.ff0000.redproject;

import android.annotation.TargetApi;
import android.content.DialogInterface;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.os.Build;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AlertDialog;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.SurfaceView;
import android.view.WindowManager;

import org.opencv.android.BaseLoaderCallback;
import org.opencv.android.CameraBridgeViewBase;
import org.opencv.android.LoaderCallbackInterface;
import org.opencv.android.OpenCVLoader;
import org.opencv.android.Utils;
import org.opencv.core.Mat;
import org.opencv.core.MatOfPoint;
import org.opencv.core.Size;
import org.opencv.imgproc.Imgproc;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class CameraActivity extends AppCompatActivity implements CameraBridgeViewBase.CvCameraViewListener2 {

    private static final String TAG = "opencv";
    private CameraBridgeViewBase mOpenCvCameraView;
    private Mat matInput;
    private Mat matResult;
    private Bitmap bitmap;
    private boolean b = false;

    public native void ConvertRGBtoGray(long matAddrInput, long matAddrResult);

    public native void minus(long firstImage, long secondImage, int alpha);

    public native void detectEdgeJNI(long inputImage, long outputImage, int th1, int th2);

    static {
        System.loadLibrary("opencv_java4");
        System.loadLibrary("native-lib");
    }

    private BaseLoaderCallback mLoaderCallback = new BaseLoaderCallback(this) {
        @Override
        public void onManagerConnected(int status) {
            switch (status) {
                case LoaderCallbackInterface.SUCCESS: {
                    mOpenCvCameraView.enableView();
                }
                break;
                default: {
                    super.onManagerConnected(status);
                }
                break;
            }
        }
    };


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_camera);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            //퍼미션 상태 확인
            if (!hasPermissions(PERMISSIONS)) {

                //퍼미션 허가 안되어있다면 사용자에게 요청
                requestPermissions(PERMISSIONS, PERMISSIONS_REQUEST_CODE);
            }
        }

        mOpenCvCameraView = findViewById(R.id.activity_surface_view);
        mOpenCvCameraView.setVisibility(SurfaceView.VISIBLE);
        mOpenCvCameraView.setCvCameraViewListener(this);
        mOpenCvCameraView.setCameraIndex(0); // front-camera(1),  back-camera(0)
        mLoaderCallback.onManagerConnected(LoaderCallbackInterface.SUCCESS);
    }

    @Override
    public void onPause() {
        super.onPause();
        if (mOpenCvCameraView != null)
            mOpenCvCameraView.disableView();
    }

    @Override
    public void onResume() {
        super.onResume();

        if (!OpenCVLoader.initDebug()) {
            Log.d(TAG, "onResume :: Internal OpenCV library not found.");
            OpenCVLoader.initAsync(OpenCVLoader.OPENCV_VERSION_3_2_0, this, mLoaderCallback);
        } else {
            Log.d(TAG, "onResum :: OpenCV library found inside package. Using it!");
            mLoaderCallback.onManagerConnected(LoaderCallbackInterface.SUCCESS);
        }
    }

    public void onDestroy() {
        super.onDestroy();

        if (mOpenCvCameraView != null)
            mOpenCvCameraView.disableView();
    }

    @Override
    public void onCameraViewStarted(int width, int height) {

    }

    @Override
    public void onCameraViewStopped() {

    }

    @Override
    public Mat onCameraFrame(CameraBridgeViewBase.CvCameraViewFrame inputFrame) {

        matInput = inputFrame.rgba();

        if (matResult != null) matResult.release();
        matResult = new Mat(matInput.rows(), matInput.cols(), matInput.type());
        Mat medianResult = new Mat(matInput.rows(), matInput.cols(), matInput.type());
        Mat matKernel = new Mat();

        int w = (int) matInput.size().width;
        int h = (int) matInput.size().height;
        float wRatio = w / 720;
        float hRatio = h / 480;
        int alpha = 1;
        Imgproc.Canny(matInput, matResult, 50, 150);

        Imgproc.cvtColor(matInput, matResult, Imgproc.COLOR_RGBA2BGR);
        Imgproc.resize(matResult, matResult, new Size(720, 480));
        Imgproc.medianBlur(matResult, medianResult, 5);
        Imgproc.GaussianBlur(medianResult, matResult, new Size(1, 47), 0);
        Imgproc.GaussianBlur(matResult, matResult, new Size(71, 1), 0);

        Imgproc.GaussianBlur(medianResult, medianResult, new Size(11, 15), 0);

        //Imgproc.Canny(matInput, matResult, 50, 150);

        minusImage(matResult, matResult, alpha);

        /*
        Imgproc.cvtColor(matResult, matResult, Imgproc.COLOR_BGR2GRAY);
        Imgproc.adaptiveThreshold(matResult, matResult, 1,
                Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C,
                Imgproc.THRESH_BINARY_INV,
                31,
                5);
        matKernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(3, 4));

        Imgproc.erode(matResult, matResult, matKernel);
        Imgproc.erode(matResult, matResult, matKernel);

        Imgproc.dilate(matResult, matResult, matKernel);
        Imgproc.dilate(matResult, matResult, matKernel);
        Imgproc.dilate(matResult, matResult, matKernel);
        Imgproc.dilate(matResult, matResult, matKernel);
        Imgproc.dilate(matResult, matResult, matKernel);
        Imgproc.dilate(matResult, matResult, matKernel);
        Imgproc.dilate(matResult, matResult, matKernel);
        Imgproc.dilate(matResult, matResult, matKernel);
        Imgproc.dilate(matResult, matResult, matKernel);
        Imgproc.dilate(matResult, matResult, matKernel);


        Imgproc.erode(matResult, matResult, matKernel);
        Imgproc.erode(matResult, matResult, matKernel);
        Imgproc.erode(matResult, matResult, matKernel);
        Imgproc.erode(matResult, matResult, matKernel);
        Imgproc.erode(matResult, matResult, matKernel);
        Imgproc.erode(matResult, matResult, matKernel);
        Imgproc.erode(matResult, matResult, matKernel);
        Imgproc.erode(matResult, matResult, matKernel);

        List<MatOfPoint> contours = new ArrayList<>();
        Mat matHicy = new Mat();

        Imgproc.findContours(matResult, contours, matHicy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_NONE);
        */

        Imgproc.resize(matResult, matResult, new Size(w, h));

        return matResult;
    }

    private void minusImage(Mat matFirst, Mat matSecond, int alpha) {


        //Mat matMinus = new Mat(matFirst.rows(), matFirst.cols(), matFirst.type());
        minus(matFirst.nativeObj, matSecond.nativeObj, alpha);

        /*
        int c = matFirst.cols();
        int r = matFirst.rows();

        double[] bufFirst;
        double[] bufSecond;

        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {

                //double[] bufFirst = matFirst.get(i, j);
                //double[] bufSecond = matSecond.get(i, j);

                double[] array = new double[3];

                for(int k = 0; k < 3; k++) {
                    int different = (int) ((alpha + 1) * bufFirst[k] - alpha * bufSecond[k]);

                    if(different < 0) {
                        different = 0;
                    }

                    array[k] = different;
                }

                matMinus.put(i, j, array);
            }

        }
        */

    }

    //여기서부턴 퍼미션 관련 메소드
    static final int PERMISSIONS_REQUEST_CODE = 1000;
    String[] PERMISSIONS = {"android.permission.CAMERA"};

    private boolean hasPermissions(String[] permissions) {
        int result;

        //스트링 배열에 있는 퍼미션들의 허가 상태 여부 확인
        for (String perms : permissions) {

            result = ContextCompat.checkSelfPermission(this, perms);

            if (result == PackageManager.PERMISSION_DENIED) {
                //허가 안된 퍼미션 발견
                return false;
            }
        }

        //모든 퍼미션이 허가되었음
        return true;
    }


    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        switch (requestCode) {

            case PERMISSIONS_REQUEST_CODE:
                if (grantResults.length > 0) {
                    boolean cameraPermissionAccepted = grantResults[0]
                            == PackageManager.PERMISSION_GRANTED;

                    if (!cameraPermissionAccepted)
                        showDialogForPermission("앱을 실행하려면 퍼미션을 허가하셔야합니다.");
                }
                break;
        }
    }


    @TargetApi(Build.VERSION_CODES.M)
    private void showDialogForPermission(String msg) {

        AlertDialog.Builder builder = new AlertDialog.Builder(CameraActivity.this);
        builder.setTitle("알림");
        builder.setMessage(msg);
        builder.setCancelable(false);
        builder.setPositiveButton("예", new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface dialog, int id) {
                requestPermissions(PERMISSIONS, PERMISSIONS_REQUEST_CODE);
            }
        });
        builder.setNegativeButton("아니오", new DialogInterface.OnClickListener() {
            public void onClick(DialogInterface arg0, int arg1) {
                finish();
            }
        });
        builder.create().show();
    }
}
