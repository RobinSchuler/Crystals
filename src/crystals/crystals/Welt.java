/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

import java.awt.Color;
import java.awt.Point;
import java.awt.image.BufferedImage;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.imageio.ImageIO;

/**
 * 
 * @author Bern
 */
public class Welt implements Serializable
{
    private static final long        serialVersionUID  = 54334537;
    public static int                GOLD, MITHRIL, EISEN, ZWERGEANZAHL = 0, KRISTALLE;
    public static int                WELTWIDTH;
    public static int                WELTHEIGTH;
    public static int                KAMERASTARTPUNKTX = 0;
    public static int                KAMERASTARTPUNKTY = 0;
    public static int                MAXIMA            = 0;
    public static ArrayList<Kreatur> viecher           = new ArrayList<>();
    public static int                xBasis            = 0, yBasis = 0;

    private void writeObject(java.io.ObjectOutputStream stream) throws IOException
    {
        stream.writeInt(GOLD);
        stream.writeInt(MITHRIL);
        stream.writeInt(EISEN);
        stream.writeInt(ZWERGEANZAHL);
        stream.writeInt(KRISTALLE);
        stream.writeInt(WELTWIDTH);
        stream.writeInt(WELTHEIGTH);
        stream.writeInt(KAMERASTARTPUNKTX);
        stream.writeInt(KAMERASTARTPUNKTY);
        stream.writeInt(MAXIMA);
        stream.writeInt(monsterspawnlevel);
        stream.writeInt(viecher.size());
        for (int i = 0; i < viecher.size(); i++)
        {
            stream.writeObject(viecher.get(i));
        }
        stream.writeInt(xBasis);
        stream.writeInt(yBasis);
        for (int i = 0; i < WELTWIDTH; i++)
        {
            for (int j = 0; j < WELTHEIGTH; j++)
            {
                stream.writeObject(inhalt[i][j]);
                stream.writeBoolean(sichtbar[i][j]);
                stream.writeInt(kreaturen[i][j].size());
                for (int k = 0; k < kreaturen[i][j].size(); k++)
                {
                    stream.writeObject(kreaturen[i][j].get(k));
                }
            }
        }
    }

    private void readObject(java.io.ObjectInputStream stream) throws IOException, ClassNotFoundException
    {
        GOLD = stream.readInt() + 1000;
        MITHRIL = stream.readInt()+ 1000;
        EISEN = stream.readInt();
        ZWERGEANZAHL = stream.readInt();
        KRISTALLE = stream.readInt();
        WELTWIDTH = stream.readInt();
        WELTHEIGTH = stream.readInt();
        KAMERASTARTPUNKTX = stream.readInt();
        KAMERASTARTPUNKTY = stream.readInt();
        MAXIMA = stream.readInt();
        monsterspawnlevel = stream.readInt();
        int size = stream.readInt();
        viecher = new ArrayList<>();
        for (int i = 0; i < size; i++)
        {
            viecher.add((Kreatur) stream.readObject());
        }
        xBasis = stream.readInt();
        yBasis = stream.readInt();
        inhalt = new BlockArt[WELTWIDTH][WELTHEIGTH];
        sichtbar = new boolean[WELTWIDTH][WELTHEIGTH];
        kreaturen = new ArrayList[WELTWIDTH][WELTHEIGTH];
        for (int i = 0; i < WELTWIDTH; i++)
        {
            for (int j = 0; j < WELTHEIGTH; j++)
            {
                kreaturen[i][j] = new ArrayList<>();
                inhalt[i][j] = (BlockArt) stream.readObject();
                sichtbar[i][j] = stream.readBoolean();
                int s = stream.readInt();
                for (int k = 0; k < s; k++)
                {
                    kreaturen[i][j].add((Kreatur) (stream.readObject()));
                }
            }
        }
    }

    public enum BlockArt
    {
        FALLE, LEER, ERDE, STEIN, GOLD, EISEN, MITHRIL, KRISTALL, BASIS, FELS, SCHATTEN, LAVA
    }

    public void initSpawnen()
    {
        SpawnThread s = new SpawnThread();
        s.start();
    }

    int monsterspawnlevel = -1;

    private class SpawnThread extends Thread
    {
        @Override
        public void run()
        {
            while (!interrupted() && monsterspawnlevel != -1)
            {
                int x = (int) (Math.random() * Welt.WELTWIDTH);
                int y = (int) (Math.random() * Welt.WELTHEIGTH);
                if (Welt.inhalt[x][y] == Welt.BlockArt.LEER && Welt.sichtbar[x][y])
                {
 
                }
                try
                {
                    Thread.sleep(
                            (int) ((Math.random() * 120_000_000 + 120_000_000) / (Welt.WELTHEIGTH * Welt.WELTWIDTH)));
                }
                catch (InterruptedException ex)
                {
                    Logger.getLogger(Welt.class.getName()).log(Level.SEVERE, null, ex);
                }
            }
        }
    }

    public static BlockArt[][]           inhalt;
    public static ArrayList<Kreatur>[][] kreaturen;
    static boolean[][]                   sichtbar;

    public Welt(String name)
    {
        weltLaden(name);
        sichtbarkeitberechnenvon(xBasis, yBasis);
        Zwerg z = new Zwerg(Welt.xBasis, Welt.yBasis);
        viecher.add(z);
        Zwerg z2 = new Zwerg(Welt.xBasis, Welt.yBasis);
        viecher.add(z2);
        Zwerg z3 = new Zwerg(Welt.xBasis, Welt.yBasis);
        viecher.add(z3);
    }

    public Welt(int breite, int hoehe)
    {
        WELTHEIGTH = hoehe;
        WELTWIDTH = breite;
        kreaturen = new ArrayList[WELTWIDTH][WELTHEIGTH];
        inhalt = new BlockArt[WELTWIDTH][WELTHEIGTH];
        sichtbar = new boolean[WELTWIDTH][WELTHEIGTH];
        for (int i = 0; i < WELTWIDTH; i++)
        {
            for (int j = 0; j < WELTHEIGTH; j++)
            {
                kreaturen[i][j] = new ArrayList<>();
                sichtbar[i][j] = false;
                inhalt[i][j] = BlockArt.FELS;
            }
        }
    }

    private void weltLaden(String i)
    {
        BufferedImage welt = weltbildLaden("worlds/" + i);
        WELTHEIGTH = welt.getHeight();
        WELTWIDTH = welt.getWidth();
        kreaturen = new ArrayList[WELTWIDTH][WELTHEIGTH];
        for (int i2 = 0; i2 < WELTWIDTH; i2++)
        {
            for (int j = 0; j < WELTHEIGTH; j++)
            {
                kreaturen[i2][j] = new ArrayList<>();
            }
        }
        inhalt = new BlockArt[WELTWIDTH][WELTHEIGTH];
        sichtbar = new boolean[WELTWIDTH][WELTHEIGTH];
        for (int j = 0; j < WELTWIDTH; j++)
        {
            for (int k = 0; k < WELTHEIGTH; k++)
            {
                sichtbar[j][k] = false;
                if (new Color(welt.getRGB(j, k)).getRed() == 50)
                {
                    inhalt[j][k] = BlockArt.LEER;
                    if (new Color(welt.getRGB(j, k)).getGreen() == 40)
                    {
                    }
                    else if (new Color(welt.getRGB(j, k)).getGreen() == 50)
                    {
                    }
                    else if (new Color(welt.getRGB(j, k)).getGreen() == 60)
                    {
                    }
                    else if (new Color(welt.getRGB(j, k)).getGreen() == 70)
                    {
                    }
                    else if (new Color(welt.getRGB(j, k)).getGreen() == 80)
                    {
    
                    }
                    else if (new Color(welt.getRGB(j, k)).getGreen() == 90)
                    {
    
                    }
                    else if (new Color(welt.getRGB(j, k)).getGreen() == 100)
                    {

                    }
                    else if (new Color(welt.getRGB(j, k)).getGreen() == 110)
                    {
                    }
                    else if (new Color(welt.getRGB(j, k)).getGreen() == 120)
                    {

                    }
                }
                else
                    switch (welt.getRGB(j, k))
                    {
                        case -1:
                            inhalt[j][k] = BlockArt.LEER;
                            break;
                        case -16711936:
                            inhalt[j][k] = BlockArt.ERDE;
                            break;
                        case -16776961:
                            inhalt[j][k] = BlockArt.STEIN;
                            break;
                        case -65536:
                            inhalt[j][k] = BlockArt.BASIS;
                            xBasis = j;
                            yBasis = k;
                            break;
                        case -256:
                            inhalt[j][k] = BlockArt.GOLD;
                            break;
                        case -16711681:
                            inhalt[j][k] = BlockArt.MITHRIL;
                            break;
                        case -65281:
                            inhalt[j][k] = BlockArt.EISEN;
                            break;
                        case -16777216:
                            inhalt[j][k] = BlockArt.KRISTALL;
                            MAXIMA++;
                            break;
                        case -3618616:
                            inhalt[j][k] = BlockArt.FALLE;
                            break;
                        case -14803426:
                            inhalt[j][k] = BlockArt.FELS;
                            break;
                        default:
                            inhalt[j][k] = BlockArt.LEER;
                            System.out.print("?: " + j + " " + k);
                            break;
                    }
            }
        }
    }

    public static BufferedImage bildLaden(String name)
    {
        FileInputStream fin;
        try
        {
            fin = new FileInputStream("assets/" + name);
            BufferedImage img = ImageIO.read(fin);
            return img;
        }
        catch (Exception ex)
        {
            Logger.getLogger(Welt.class.getName()).log(Level.SEVERE, null, ex);
            return null;
        }
    }

    public static BufferedImage weltbildLaden(String name)
    {
        FileInputStream fin;
        try
        {
            fin = new FileInputStream(name);
            BufferedImage img = ImageIO.read(fin);
            return img;
        }
        catch (Exception ex)
        {
            Logger.getLogger(Welt.class.getName()).log(Level.SEVERE, null, ex);
            return null;
        }
    }

    public BlockArt gibBlock(int x, int y)
    {
        if (x >= 0 && y >= 0 && x < WELTWIDTH && y < WELTHEIGTH)
        {
            return inhalt[x][y];
        }
        else
            return BlockArt.FELS;
    }

    public void setBlock(int x, int y, BlockArt art)
    {
        if (x >= 0 && y >= 0 && x < WELTWIDTH && y < WELTHEIGTH)
        {
            inhalt[x][y] = art;
        }
    }

    public BlockArt[][] gibBildschirm(float x, float y)
    {
        x -= 13f;
        y -= 13f;
        BlockArt[][] bildschirm = new BlockArt[26][26];
        for (int i = 0; i < 26; i++)
        {
            for (int j = 0; j < 26; j++)
            {
                if (x + i >= 0 && x + i < WELTWIDTH && y + j >= 0 && y + j < WELTHEIGTH)
                {
                    if (sichtbar[(int) (x + i)][(int) (y + j)])
                    {
                        bildschirm[i][j] = inhalt[(int) (x + i)][(int) (y + j)];
                    }
                    else
                        bildschirm[i][j] = BlockArt.SCHATTEN;
                }
                else
                {
                    bildschirm[i][j] = BlockArt.SCHATTEN;
                }
            }
        }
        return bildschirm;
    }

    private static boolean sichtbarkeitberechnenvonhelper(int x, int y)
    {
        if (x >= 0 && y >= 0 && x < WELTWIDTH && y < WELTHEIGTH)
        {
            boolean b = sichtbar[x][y];
            if (sichtbar[x][y] == false)
            {
                while (!kreaturen[x][y].isEmpty())
                {
                    Kreatur k = kreaturen[x][y].remove(0);
                    if (k instanceof Zwerg)
                    {
                        ZWERGEANZAHL++;
                    }
                    viecher.add(k);
                }
            }
            sichtbar[x][y] = true;
            if (b != true && (inhalt[x][y] == BlockArt.BASIS || inhalt[x][y] == BlockArt.LEER
                    || inhalt[x][y] == BlockArt.KRISTALL))
            {
                sichtbarkeitberechnenvon(x - 1, y);
                sichtbarkeitberechnenvon(x + 1, y);
                sichtbarkeitberechnenvon(x, y - 1);
                sichtbarkeitberechnenvon(x, y + 1);
                return true;
            }
        }
        return false;
    }

    public static void sichtbarkeitberechnenvon(int x, int y)
    {
        if (x >= 0 && y >= 0 && x < WELTWIDTH && y < WELTHEIGTH)
        {
            sichtbar[x][y] = true;
            while (!kreaturen[x][y].isEmpty())
            {
                Kreatur k = kreaturen[x][y].remove(0);
                if (k instanceof Zwerg)
                {
                    ZWERGEANZAHL++;
                }
                viecher.add(k);
            }
            if ((inhalt[x][y] == BlockArt.BASIS || inhalt[x][y] == BlockArt.LEER || inhalt[x][y] == BlockArt.KRISTALL))
            {
                boolean b = false;
                if (sichtbarkeitberechnenvonhelper(x - 1, y))
                    b = true;
                if (sichtbarkeitberechnenvonhelper(x + 1, y))
                    b = true;
                if (sichtbarkeitberechnenvonhelper(x, y - 1))
                    b = true;
                if (sichtbarkeitberechnenvonhelper(x, y + 1))
                    b = true;
                // if(b)
                // Fenster.soundLaden("neuehoehle.wav");
            }
        }
    }

    public static ArrayList<Befehl> wegBerechnen(int vonx, int vony, int zux, int zuy)
    {
        ArrayList<Befehl> weg = new ArrayList<>();
        if (zux >= 0 && zuy >= 0 && zux < WELTWIDTH && zuy < WELTWIDTH)
        {
            int[][] pathfind = new int[WELTWIDTH][WELTHEIGTH];
            for (int i = 0; i < WELTWIDTH; i++)
            {
                Arrays.fill(pathfind[i], Integer.MAX_VALUE);
            }
            ArrayList<Point> zubesuchen = new ArrayList<>();
            zubesuchen.add(new Point(vonx, vony));
            pathfind[vonx][vony] = 0;
            boolean pathnotfound = true;
            while (pathnotfound)
            {
                if (zubesuchen.isEmpty())
                {
                    // WEG EXISTIERT NICHT
                    return new ArrayList<>();
                }
                else
                {
                    Point ambesuchen = zubesuchen.remove(0);
                    if (ambesuchen.x == zux && ambesuchen.y == zuy)
                    {
                        pathnotfound = false;
                    }
                    else if (ambesuchen.x < 0 && ambesuchen.y < 0 && ambesuchen.x >= WELTWIDTH
                            && ambesuchen.y >= WELTWIDTH)
                    {
                        return new ArrayList<>();
                    }
                    else if (inhalt[ambesuchen.x][ambesuchen.y] == BlockArt.LEER
                            || inhalt[ambesuchen.x][ambesuchen.y] == BlockArt.BASIS
                            || inhalt[ambesuchen.x][ambesuchen.y] == BlockArt.KRISTALL)
                    {
                        if (pathfind[ambesuchen.x - 1][ambesuchen.y] > pathfind[ambesuchen.x][ambesuchen.y] + 1
                                && (inhalt[ambesuchen.x - 1][ambesuchen.y] == BlockArt.LEER
                                        || inhalt[ambesuchen.x - 1][ambesuchen.y] == BlockArt.KRISTALL))
                        {
                            pathfind[ambesuchen.x - 1][ambesuchen.y] = pathfind[ambesuchen.x][ambesuchen.y] + 1;
                            zubesuchen.add(new Point(ambesuchen.x - 1, ambesuchen.y));
                        }
                        if (pathfind[ambesuchen.x + 1][ambesuchen.y] > pathfind[ambesuchen.x][ambesuchen.y] + 1
                                && (inhalt[ambesuchen.x + 1][ambesuchen.y] == BlockArt.LEER
                                        || inhalt[ambesuchen.x + 1][ambesuchen.y] == BlockArt.KRISTALL))
                        {
                            pathfind[ambesuchen.x + 1][ambesuchen.y] = pathfind[ambesuchen.x][ambesuchen.y] + 1;
                            zubesuchen.add(new Point(ambesuchen.x + 1, ambesuchen.y));
                        }
                        if (pathfind[ambesuchen.x][ambesuchen.y - 1] > pathfind[ambesuchen.x][ambesuchen.y] + 1
                                && (inhalt[ambesuchen.x][ambesuchen.y - 1] == BlockArt.LEER
                                        || inhalt[ambesuchen.x][ambesuchen.y - 1] == BlockArt.KRISTALL))
                        {
                            pathfind[ambesuchen.x][ambesuchen.y - 1] = pathfind[ambesuchen.x][ambesuchen.y] + 1;
                            zubesuchen.add(new Point(ambesuchen.x, ambesuchen.y - 1));
                        }
                        if (pathfind[ambesuchen.x][ambesuchen.y + 1] > pathfind[ambesuchen.x][ambesuchen.y] + 1
                                && (inhalt[ambesuchen.x][ambesuchen.y + 1] == BlockArt.LEER
                                        || inhalt[ambesuchen.x][ambesuchen.y + 1] == BlockArt.KRISTALL))
                        {
                            pathfind[ambesuchen.x][ambesuchen.y + 1] = pathfind[ambesuchen.x][ambesuchen.y] + 1;
                            zubesuchen.add(new Point(ambesuchen.x, ambesuchen.y + 1));
                        }
                    }
                }
            }
            /*
             * for (int i = 0; i < WELTHEIGTH; i++) { for (int j = 0; j < WELTWIDTH; j++) {
             * System.out.print(pathfind[i][j] + " "); } System.out.println(); }
             */
            boolean wegfertig = false;
            while (!wegfertig)
            {
                // System.out.println(zux + " " + zuy);
                weg.add(0, new Befehl("laufen", zux, zuy));
                if (vonx == zux && vony == zuy)
                {
                    wegfertig = true;
                }
                else if (pathfind[zux - 1][zuy] <= pathfind[zux + 1][zuy]
                        && pathfind[zux - 1][zuy] <= pathfind[zux][zuy - 1]
                        && pathfind[zux - 1][zuy] <= pathfind[zux][zuy + 1])
                {
                    zux--;
                }
                else if (pathfind[zux + 1][zuy] <= pathfind[zux - 1][zuy]
                        && pathfind[zux + 1][zuy] <= pathfind[zux][zuy - 1]
                        && pathfind[zux + 1][zuy] <= pathfind[zux][zuy + 1])
                {
                    zux++;
                }
                else if (pathfind[zux][zuy - 1] <= pathfind[zux - 1][zuy]
                        && pathfind[zux][zuy - 1] <= pathfind[zux + 1][zuy]
                        && pathfind[zux][zuy - 1] <= pathfind[zux][zuy + 1])
                {
                    zuy--;
                }
                else if (pathfind[zux][zuy + 1] <= pathfind[zux - 1][zuy]
                        && pathfind[zux][zuy + 1] <= pathfind[zux + 1][zuy]
                        && pathfind[zux][zuy + 1] <= pathfind[zux][zuy - 1])
                {
                    zuy++;
                }
            }
            weg.remove(0);
        }
        return weg;
    }

    public static void kreaturAnmelden(Kreatur k, int x, int y)
    {
        kreaturen[x][y].add(k);
    }

    public static ArrayList<Kreatur> gegnerGeben(int x, int y)
    {
        ArrayList<Kreatur> arr = (ArrayList<Kreatur>) kreaturen[x][y].clone();
        return arr;
    }

    public static boolean kreaturAbmelden(Kreatur k, int x, int y)
    {
        if (kreaturen[x][y].size() > 1)
        {
            if (k instanceof Zwerg)
            {
                for (Kreatur kr : kreaturen[x][y])
                {
                    if (!(kr instanceof Zwerg))
                    {
                        return false;
                    }
                }
            }
            else
            {
                for (Kreatur kr : kreaturen[x][y])
                {
                    if (kr instanceof Zwerg)
                    {
                        return false;
                    }
                }
            }
        }
        kreaturen[x][y].remove(k);
        return true;
    }
}
